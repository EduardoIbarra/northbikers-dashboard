import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getSupabase } from '../../utils/supabase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function AddProductPage() {
  const router = useRouter();
  const { routeId } = router.query;
  const supabase = getSupabase();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    custom_fields_schema: '', // added for custom fields
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeQuery, setRouteQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data, error } = await supabase.from('routes').select('id, title').order('id', { ascending: false });
      if (!error && data) {
        setRoutes(data);
        if (routeId) {
          const found = data.find(r => r.id.toString() === routeId.toString());
          if (found) {
            setSelectedRoute(found);
            setRouteQuery(found.title || `Ruta ${found.id}`);
          }
        }
      }
    };
    fetchRoutes();
  }, [supabase, routeId]);

  const filteredRoutes = routeQuery === ''
    ? routes
    : routes.filter((route) =>
        (route.title || '').toLowerCase().includes(routeQuery.toLowerCase()) || 
        route.id.toString().includes(routeQuery)
      );

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);

      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const urlToRevoke = prev[index];
      URL.revokeObjectURL(urlToRevoke);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido.');
      return;
    }
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      toast.error('Ingresa un precio válido.');
      return;
    }
    if (files.length === 0) {
      toast.error('Debes subir al menos una imagen del producto.');
      return;
    }

    setLoading(true);

    try {
      const priceCents = Math.round(parseFloat(formData.price) * 100);

      let parsedCustomFields = null;
      if (formData.custom_fields_schema.trim()) {
        try {
          parsedCustomFields = JSON.parse(formData.custom_fields_schema);
        } catch (err) {
          toast.error('El esquema de campos personalizados no es un JSON válido.');
          setLoading(false);
          return;
        }
      }

      // 1. Insert product into `products` table
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          price_cents: priceCents,
          is_active: true,
          pictures_csv: '', // Will update after upload
          custom_fields_schema: parsedCustomFields,
        })
        .select('id')
        .single();

      if (productError) throw new Error(`Error creando producto: ${productError.message}`);
      const newProductId = productData.id;

      // 2. Upload images to Supabase storage
      const uploadedUrls = [];
      const projectRef = 'aezxnubglexywadbjpgo';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `products/${newProductId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pictures')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error(`Error subiendo imagen ${file.name}: ${uploadError.message}`);

        const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/pictures/${fileName}`;
        uploadedUrls.push(publicUrl);
      }

      const picturesCsv = uploadedUrls.join(',');

      // 3. Update product with pictures_csv
      const { error: updateError } = await supabase
        .from('products')
        .update({ pictures_csv: picturesCsv })
        .eq('id', newProductId);

      if (updateError) throw new Error(`Error guardando imágenes: ${updateError.message}`);

      // 4. Link product to route in `route_products` table if route is selected
      const targetRouteId = selectedRoute?.id || routeId;
      if (targetRouteId) {
        const { error: routeProductError } = await supabase
          .from('route_products')
          .insert({
            route_id: parseInt(targetRouteId),
            product_id: newProductId,
            is_active: true,
          });

        if (routeProductError) throw new Error(`Error asociando producto a la ruta: ${routeProductError.message}`);
      }

      toast.success('Producto creado exitosamente!');
      
      // Redirect back after a short delay
      setTimeout(() => {
        router.push('/routes'); // Redirect to routes list or builder
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Ocurrió un error inesperado al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Agregar Producto — NorthBikers</title>
      </Head>
      <ToastContainer />
      <div className="min-h-screen bg-gray-900 text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                Agregar Producto {(selectedRoute || routeId) ? 'a Ruta' : 'Global'}
              </h1>
              {(selectedRoute || routeId) && (
                <p className="text-sm text-gray-400 mt-1">
                  Ruta ID: <span className="font-semibold text-gray-300">{selectedRoute?.id || routeId}</span>
                </p>
              )}
            </div>
            <Link
              href="/routes"
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition duration-200 shadow-sm"
            >
              Volver
            </Link>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 space-y-6">
              
              {/* Route Selector Field */}
              <div className="relative z-20">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Ruta Asociada (Opcional)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={routeQuery}
                    onChange={(e) => {
                      setRouteQuery(e.target.value);
                      setSelectedRoute(null);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    placeholder="Buscar ruta..."
                    className="w-full bg-gray-900/50 text-gray-100 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {isDropdownOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {filteredRoutes.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-400">No se encontraron rutas.</div>
                      ) : (
                        filteredRoutes.map((route) => (
                          <div
                            key={route.id}
                            className="px-4 py-2 text-sm text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedRoute(route);
                              setRouteQuery(route.title || `Ruta ${route.id}`);
                              setIsDropdownOpen(false);
                            }}
                          >
                            {route.title || `Ruta ${route.id}`} (ID: {route.id})
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Título del Producto</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ej: Playera Oficial Reto NL"
                  className="w-full bg-gray-900/50 text-gray-100 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Detalles sobre materiales, tallas, edición..."
                  className="w-full bg-gray-900/50 text-gray-100 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Price Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Precio (MXN)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-gray-900/50 text-gray-100 border border-gray-700 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Custom Fields Schema Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Campos Personalizados (Opcional - JSON)</label>
                <textarea
                  name="custom_fields_schema"
                  value={formData.custom_fields_schema}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder='Ej: { "fields": [ { "name": "size", "label": "Talla", "type": "text", "required": true } ] }'
                  className="w-full bg-gray-900/50 text-gray-100 border border-gray-700 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">Define los campos en formato JSON. Déjalo en blanco si no aplica.</p>
              </div>

              {/* Images Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Imágenes del Producto</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-xl hover:border-blue-500 hover:bg-gray-800/30 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-400 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none">
                        <span>Sube archivos</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                  </div>
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {previews.map((src, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-700 aspect-square">
                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            {/* Submit Button */}
            <div className="px-8 py-5 bg-gray-900/50 border-t border-gray-700 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-xl border border-transparent bg-gradient-to-r from-blue-600 to-blue-500 py-3 px-8 text-sm font-medium text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  'Crear Producto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
