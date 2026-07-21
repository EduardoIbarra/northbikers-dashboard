import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { getSupabase } from '../utils/supabase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const centsToMoney = (c) => MXN.format((c ?? 0) / 100);

export default function ProductsPage() {
  const supabase = getSupabase();

  const [products, setProducts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routeProducts, setRouteProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inspectingProduct, setInspectingProduct] = useState(null);

  // Sales state
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    custom_fields_schema: '',
    shipping_enabled: false,
    shipping_price: '200',
    shipping_details: '',
    pickup_details: '',
    selectedRoutes: [],
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [saving, setSaving] = useState(false);

  // Custom Fields Schema helper functions for visual builder
  const getCustomFieldsList = () => {
    if (!formData.custom_fields_schema) return [];
    try {
      const parsed = typeof formData.custom_fields_schema === 'string'
        ? JSON.parse(formData.custom_fields_schema)
        : formData.custom_fields_schema;
      if (parsed && Array.isArray(parsed.fields)) {
        return parsed.fields;
      }
    } catch (e) {
      // ignore
    }
    return [];
  };

  const handleAddField = () => {
    const fields = getCustomFieldsList();
    const newField = {
      name: `campo_${fields.length + 1}`,
      label: `Campo ${fields.length + 1}`,
      type: 'text',
      required: false,
      options: []
    };
    const updated = [...fields, newField];
    setFormData(prev => ({
      ...prev,
      custom_fields_schema: JSON.stringify({ fields: updated }, null, 2)
    }));
  };

  const handleUpdateField = (index, key, val) => {
    const fields = getCustomFieldsList();
    const updatedFields = fields.map((field, idx) => {
      if (idx === index) {
        if (key === 'label') {
          const nameVal = val.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/__+/g, '_')
            .replace(/^_+|_+$/g, '');
          return { ...field, label: val, name: nameVal };
        }
        if (key === 'options_raw') {
          return { ...field, options: val };
        }
        return { ...field, [key]: val };
      }
      return field;
    });
    setFormData(prev => ({
      ...prev,
      custom_fields_schema: JSON.stringify({ fields: updatedFields }, null, 2)
    }));
  };

  const handleDeleteField = (index) => {
    const fields = getCustomFieldsList();
    const updatedFields = fields.filter((_, idx) => idx !== index);
    setFormData(prev => ({
      ...prev,
      custom_fields_schema: updatedFields.length > 0 
        ? JSON.stringify({ fields: updatedFields }, null, 2)
        : ''
    }));
  };

  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = (productId) => {
    const link = `https://www.northbikers.com/product/${productId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(productId);
      toast.success('¡Enlace de producto copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy', err);
      toast.error('No se pudo copiar el enlace.');
    });
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        { data: prodData, error: prodErr },
        { data: routeData, error: routeErr },
        { data: rpData, error: rpErr },
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('routes').select('id, title').order('id', { ascending: false }),
        supabase.from('route_products').select('*'),
      ]);

      if (prodErr) throw prodErr;
      if (routeErr) throw routeErr;
      if (rpErr) throw rpErr;

      setProducts(prodData || []);
      setRoutes(routeData || []);
      setRouteProducts(rpData || []);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch sales for inspecting product
  const fetchSales = async (product) => {
    if (!product) return;
    try {
      setLoadingSales(true);
      setSales([]);

      // 1. Fetch sales from event_profile_product (registration add-ons)
      const { data: epProdData, error: epProdErr } = await supabase
        .from('event_profile_product')
        .select(`
          id, quantity, unit_price_cents, notes, created_at,
          event_profile!inner (
            id, full_name, payment_status,
            profile:profiles ( id, name, email )
          )
        `)
        .eq('product_id', product.id)
        .eq('event_profile.payment_status', 'paid');

      if (epProdErr) throw epProdErr;

      // 2. Fetch sales from profile_product (direct/standalone purchases)
      const { data: profProdData, error: profProdErr } = await supabase
        .from('profile_product')
        .select(`
          id, quantity, unit_price_cents, notes, created_at,
          profile:profiles ( id, name, email )
        `)
        .eq('product_id', product.id);

      if (profProdErr) throw profProdErr;

      // Map registrations
      const salesFromEp = (epProdData || []).map(item => {
        let delivery_method = 'pickup';
        let shipping_address = '';
        let customFieldsAnswers = {};

        if (item.notes) {
          try {
            const parsed = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes;
            delivery_method = parsed.delivery_method || 'pickup';
            shipping_address = parsed.shipping_address || '';
            
            // Delete delivery info to get only custom field answers
            const cleanObj = { ...parsed };
            delete cleanObj.delivery_method;
            delete cleanObj.shipping_address;
            customFieldsAnswers = cleanObj;
          } catch (e) {
            console.error('Failed to parse notes', e);
          }
        }

        return {
          id: item.id,
          created_at: item.created_at,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.quantity * item.unit_price_cents,
          buyer_name: item.event_profile?.full_name || item.event_profile?.profile?.name || 'Participante',
          buyer_email: item.event_profile?.profile?.email || '—',
          delivery_method,
          shipping_address,
          answers: customFieldsAnswers,
          type: 'Registro / Add-on',
        };
      });

      // Map direct purchases
      const salesFromDirect = (profProdData || []).map(item => {
        let delivery_method = 'pickup';
        let shipping_address = '';
        let customFieldsAnswers = {};

        if (item.notes) {
          try {
            const parsed = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes;
            delivery_method = parsed.delivery_method || 'pickup';
            shipping_address = parsed.shipping_address || '';
            
            const cleanObj = { ...parsed };
            delete cleanObj.delivery_method;
            delete cleanObj.shipping_address;
            customFieldsAnswers = cleanObj;
          } catch (e) {
            console.error('Failed to parse notes', e);
          }
        }

        return {
          id: item.id,
          created_at: item.created_at,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          total_cents: item.quantity * item.unit_price_cents,
          buyer_name: item.profile?.name || 'Cliente',
          buyer_email: item.profile?.email || '—',
          delivery_method,
          shipping_address,
          answers: customFieldsAnswers,
          type: 'Compra Directa',
        };
      });

      // Combine and sort
      const combined = [...salesFromEp, ...salesFromDirect].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setSales(combined);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando las ventas de este producto.');
    } finally {
      setLoadingSales(false);
    }
  };

  // Trigger sales fetch when inspecting product changes
  useEffect(() => {
    if (inspectingProduct) {
      fetchSales(inspectingProduct);
    }
  }, [inspectingProduct]);

  // Aggregate quantity sold per product ID
  const salesCountMap = useMemo(() => {
    // Note: To show counts on the main list immediately without clicking, we can't wait for individual sales fetch.
    // Instead, let's write a quick lightweight query for total units sold per product, or aggregate locally when listing.
    // But since the product list is displayed, we want to know units sold. Let's do a lightweight select of all event_profile_product and profile_product rows.
    // Let's load the total quantities dynamically in fetchData!
    // But to keep it simple, we can load all records and sum them in useEffect.
    return {};
  }, [products]);

  // Handle soft delete / toggling active status
  const handleToggleActive = async (product) => {
    try {
      const nextStatus = !product.is_active;
      const { error } = await supabase
        .from('products')
        .update({ is_active: nextStatus })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(nextStatus ? 'Producto activado.' : 'Producto desactivado (Soft delete).');
      
      // Update local state
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, is_active: nextStatus } : p)
      );
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar el estado del producto.');
    }
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      price: '',
      custom_fields_schema: '',
      shipping_enabled: false,
      shipping_price: '200',
      shipping_details: '',
      pickup_details: '',
      selectedRoutes: [],
    });
    setFiles([]);
    setPreviews([]);
    setExistingImages([]);
    setShowFormModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    
    // Find associated route IDs
    const linkedRouteIds = routeProducts
      .filter(rp => rp.product_id === product.id)
      .map(rp => rp.route_id);

    setFormData({
      title: product.title || '',
      description: product.description || '',
      price: product.price_cents ? (product.price_cents / 100).toString() : '',
      custom_fields_schema: product.custom_fields_schema ? JSON.stringify(product.custom_fields_schema, null, 2) : '',
      shipping_enabled: !!product.shipping_enabled,
      shipping_price: product.shipping_price_cents ? (product.shipping_price_cents / 100).toString() : '200',
      shipping_details: product.shipping_details || '',
      pickup_details: product.pickup_details || '',
      selectedRoutes: linkedRouteIds,
    });

    const pics = (product.pictures_csv || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setFiles([]);
    setPreviews([]);
    setExistingImages(pics);
    setShowFormModal(true);
  };

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRouteToggle = (routeId) => {
    setFormData(prev => {
      const current = prev.selectedRoutes;
      const next = current.includes(routeId)
        ? current.filter(id => id !== routeId)
        : [...current, routeId];
      return { ...prev, selectedRoutes: next };
    });
  };

  // Handle files
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeNewFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingImage = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit Product Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido.');
      return;
    }
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      toast.error('Ingresa un precio de venta válido.');
      return;
    }
    if (formData.shipping_enabled && (!formData.shipping_price || isNaN(formData.shipping_price) || parseFloat(formData.shipping_price) < 0)) {
      toast.error('Ingresa un costo de envío válido.');
      return;
    }

    let parsedCustomFields = null;
    if (formData.custom_fields_schema.trim()) {
      try {
        parsedCustomFields = JSON.parse(formData.custom_fields_schema);
      } catch (err) {
        toast.error('Esquema de campos personalizados JSON no es válido.');
        return;
      }
    }

    setSaving(true);
    try {
      const priceCents = Math.round(parseFloat(formData.price) * 100);
      const shippingPriceCents = formData.shipping_enabled 
        ? Math.round(parseFloat(formData.shipping_price) * 100) 
        : 20000;

      const productPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price_cents: priceCents,
        custom_fields_schema: parsedCustomFields,
        shipping_enabled: formData.shipping_enabled,
        shipping_price_cents: shippingPriceCents,
        shipping_details: formData.shipping_details.trim() || null,
        pickup_details: formData.pickup_details.trim() || null,
        is_active: editingProduct ? editingProduct.is_active : true,
      };

      let productId = editingProduct?.id;

      // 1. Insert or Update Product
      if (editingProduct) {
        const { error: prodErr } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', productId);
        if (prodErr) throw prodErr;
      } else {
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert({ ...productPayload, pictures_csv: '' })
          .select('id')
          .single();
        if (prodErr) throw prodErr;
        productId = newProd.id;
      }

      // 2. Upload images
      const projectRef = 'aezxnubglexywadbjpgo';
      const uploadedUrls = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `products/${productId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pictures')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`);

        const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/pictures/${fileName}`;
        uploadedUrls.push(publicUrl);
      }

      // Final pictures list: combine remaining existing images + newly uploaded images
      const finalPicturesCsv = [...existingImages, ...uploadedUrls].join(',');

      // 3. Update pictures_csv
      const { error: picUpdateErr } = await supabase
        .from('products')
        .update({ pictures_csv: finalPicturesCsv })
        .eq('id', productId);
      if (picUpdateErr) throw picUpdateErr;

      // 4. Update route associations
      // Fetch existing links
      const currentLinks = routeProducts.filter(rp => rp.product_id === productId);
      const currentRouteIds = currentLinks.map(rp => rp.route_id);

      const routesToAdd = formData.selectedRoutes.filter(id => !currentRouteIds.includes(id));
      const routesToRemove = currentRouteIds.filter(id => !formData.selectedRoutes.includes(id));

      // Add new links
      if (routesToAdd.length > 0) {
        const { error: insErr } = await supabase
          .from('route_products')
          .insert(routesToAdd.map(rid => ({
            route_id: rid,
            product_id: productId,
            is_active: true
          })));
        if (insErr) throw insErr;
      }

      // Remove deleted links
      if (routesToRemove.length > 0) {
        const { error: delErr } = await supabase
          .from('route_products')
          .delete()
          .eq('product_id', productId)
          .in('route_id', routesToRemove);
        if (delErr) throw delErr;
      }

      toast.success(editingProduct ? 'Producto actualizado!' : 'Producto creado!');
      setShowFormModal(false);
      fetchData(); // reload
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error guardando el producto.');
    } finally {
      setSaving(false);
    }
  };

  // Export CSV of product sales
  const handleExportSales = () => {
    if (!inspectingProduct || sales.length === 0) return;
    const header = [
      'Fecha', 'Comprador', 'Email', 'Cantidad', 'Unitario (MXN)', 'Subtotal (MXN)',
      'Método de entrega', 'Dirección de envío', 'Respuestas campos personalizados', 'Tipo'
    ];
    const body = sales.map(s => [
      new Date(s.created_at).toLocaleString('es-MX'),
      s.buyer_name,
      s.buyer_email,
      s.quantity,
      (s.unit_price_cents / 100).toFixed(2),
      (s.total_cents / 100).toFixed(2),
      s.delivery_method === 'ship' ? 'Envío a domicilio' : 'Recoger en persona',
      s.shipping_address || '',
      JSON.stringify(s.answers),
      s.type,
    ]);

    const csvContent = [header, ...body].map(r => r.map(val => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${inspectingProduct.title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Administrar Productos — NorthBikers</title>
      </Head>
      <ToastContainer />

      <div className="min-h-screen bg-gray-950 text-gray-100 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-tight">
                Productos
              </h1>
              <p className="text-sm text-gray-400 mt-1">Crea, edita y revisa el inventario y las ventas de artículos.</p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition duration-200"
            >
              Agregar Producto
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20 text-gray-400">Cargando productos…</div>
          ) : products.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400">
              No hay productos registrados. Presiona "Agregar Producto" para comenzar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const pics = (product.pictures_csv || '')
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                const firstPic = pics[0] || null;

                const linkedRoutesCount = routeProducts.filter(rp => rp.product_id === product.id).length;

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col bg-gray-900 border ${product.is_active ? 'border-gray-800' : 'border-red-900/30 bg-gray-900/30'} rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-700/80 transition duration-200`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-gray-950 overflow-hidden border-b border-gray-800">
                      {firstPic ? (
                        <img src={firstPic} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-600 text-sm">Sin imagen</div>
                      )}
                      <div className="absolute right-3 top-3 rounded-lg bg-gray-900/90 px-3 py-1.5 text-xs font-black text-white shadow backdrop-blur-md">
                        {centsToMoney(product.price_cents)}
                      </div>
                      {!product.is_active && (
                        <div className="absolute left-3 top-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow">
                          INACTIVO
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-white truncate flex-1">{product.title}</h3>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(product.id)}
                          className="flex items-center justify-center p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition duration-200 border border-gray-700 shrink-0"
                          title="Copiar enlace del producto"
                        >
                          {copiedId === product.id ? (
                            <span className="text-[10px] text-emerald-400 font-bold px-1">¡Copiado!</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {product.description || 'Sin descripción.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-[10px] font-bold bg-gray-800 text-gray-300 rounded px-2.5 py-1">
                          Rutas: {linkedRoutesCount}
                        </span>
                        {product.shipping_enabled ? (
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 rounded px-2.5 py-1 border border-emerald-900/50">
                            Envío: {centsToMoney(product.shipping_price_cents)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-gray-800 text-gray-400 rounded px-2.5 py-1">
                            Solo Pickup
                          </span>
                        )}
                        {product.custom_fields_schema && (
                          <span className="text-[10px] font-bold bg-blue-950 text-blue-300 rounded px-2.5 py-1 border border-blue-900/50">
                            Custom fields
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-950 border-t border-gray-900 flex justify-between gap-2">
                      <button
                        onClick={() => setInspectingProduct(product) || setShowSalesModal(true)}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 text-xs font-bold py-2 rounded-lg transition duration-200 text-center"
                      >
                        Ver Ventas
                      </button>
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 text-xs font-bold py-2 rounded-lg transition duration-200 text-center"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`px-3 py-2 rounded-lg text-xs font-black transition duration-200 ${
                          product.is_active
                            ? 'bg-red-950/20 hover:bg-red-950 text-red-400 hover:text-red-200'
                            : 'bg-emerald-950/20 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-200'
                        }`}
                        title={product.is_active ? 'Desactivar producto (Soft Delete)' : 'Activar producto'}
                      >
                        {product.is_active ? 'Borrador' : 'Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL (CREATE / EDIT) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowFormModal(false)} />
          <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Route Associations */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Rutas en las que se ofrece (Opcional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-950 p-4 border border-gray-800 rounded-xl">
                  {routes.length === 0 ? (
                    <div className="text-xs text-gray-500 p-2">No hay rutas registradas.</div>
                  ) : (
                    routes.map(r => {
                      const checked = formData.selectedRoutes.includes(r.id);
                      return (
                        <label key={r.id} className="flex items-center gap-3 text-xs text-gray-300 cursor-pointer hover:text-white transition-colors py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleRouteToggle(r.id)}
                            className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="truncate">{r.title || `Ruta ${r.id}`} (ID: {r.id})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Título del Producto</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ej: Sudadera Oficial NB"
                  className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Detalles sobre materiales, tallas, entrega..."
                  className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Precio al público (MXN)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">$</div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Custom fields schema builder */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-gray-300">Campos Personalizados (para el Comprador)</label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    + Agregar Campo
                  </button>
                </div>
                
                {getCustomFieldsList().length === 0 ? (
                  <div className="text-center p-6 bg-gray-900/50 border border-gray-800 rounded-xl text-gray-500 text-xs">
                    Ningún campo personalizado configurado. (Opcional)
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCustomFieldsList().map((field, idx) => (
                      <div key={idx} className="bg-gray-900 p-4 border border-gray-800 rounded-xl space-y-3 relative group">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          {/* Label input */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-gray-400 mb-1">Nombre visible (Etiqueta)</label>
                            <input
                              type="text"
                              value={field.label || ''}
                              onChange={(e) => handleUpdateField(idx, 'label', e.target.value)}
                              placeholder="Ej: Talla de Sudadera"
                              className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          {/* Type Select */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-gray-400 mb-1">Tipo de Campo</label>
                            <select
                              value={field.type || 'text'}
                              onChange={(e) => handleUpdateField(idx, 'type', e.target.value)}
                              className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="text">Texto</option>
                              <option value="select">Lista de opciones (Select)</option>
                              <option value="number">Número</option>
                              <option value="checkbox">Casilla de verificación</option>
                            </select>
                          </div>

                          {/* Required Checkbox */}
                          <div className="sm:col-span-2 flex items-center justify-start pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!field.required}
                                onChange={(e) => handleUpdateField(idx, 'required', e.target.checked)}
                                className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5"
                              />
                              <span className="text-[11px] text-gray-300 font-medium">Requerido</span>
                            </label>
                          </div>

                          {/* Unique Checkbox */}
                          <div className="sm:col-span-2 flex items-center justify-start pb-2">
                            <label className="flex items-center gap-2 cursor-pointer" title="Evita que dos participantes registren el mismo valor para este producto">
                              <input
                                type="checkbox"
                                checked={!!field.unique}
                                onChange={(e) => handleUpdateField(idx, 'unique', e.target.checked)}
                                className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5"
                              />
                              <span className="text-[11px] text-gray-300 font-medium">No repetir</span>
                            </label>
                          </div>

                          {/* Delete Button */}
                          <div className="sm:col-span-1 flex justify-end pb-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteField(idx)}
                              className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/30 text-red-400 p-1.5 rounded-lg text-xs transition"
                              title="Eliminar campo"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Options Input (Only shown if type is select) */}
                        {field.type === 'select' && (
                          <div className="pt-2 border-t border-gray-900/50">
                            <label className="block text-[10px] font-semibold text-gray-400 mb-1.5">
                              Opciones del menú desplegable (presiona Enter o Coma para agregar)
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg min-h-[38px] items-center">
                              {(field.options || []).map((opt, optIdx) => (
                                <span
                                  key={optIdx}
                                  className="inline-flex items-center gap-1 bg-blue-900/40 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded text-xs font-medium"
                                >
                                  {opt}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedOpts = (field.options || []).filter((_, oIdx) => oIdx !== optIdx);
                                      handleUpdateField(idx, 'options_raw', updatedOpts);
                                    }}
                                    className="text-blue-400 hover:text-blue-200 transition text-[10px] font-bold"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                              
                              <input
                                type="text"
                                placeholder={(field.options || []).length === 0 ? "Escribe una opción y presiona Enter o Coma" : "Agregar opción..."}
                                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-xs focus:outline-none border-none p-0 min-w-[120px]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    const val = e.target.value.trim().replace(/,$/, '');
                                    if (val && !(field.options || []).includes(val)) {
                                      const updatedOpts = [...(field.options || []), val];
                                      handleUpdateField(idx, 'options_raw', updatedOpts);
                                    }
                                    e.target.value = '';
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim().replace(/,$/, '');
                                  if (val && !(field.options || []).includes(val)) {
                                    const updatedOpts = [...(field.options || []), val];
                                    handleUpdateField(idx, 'options_raw', updatedOpts);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Hidden/Helper Name display */}
                        <div className="text-[9px] text-gray-500 mt-1">
                          Clave interna (BD): <code className="bg-gray-900 text-gray-400 px-1 py-0.5 rounded font-mono">{field.name}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shipping toggle */}
              <div className="bg-gray-900 p-4 border border-gray-800 rounded-xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="shipping_enabled"
                    checked={formData.shipping_enabled}
                    onChange={handleInputChange}
                    className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-gray-200">Habilitar opción de envío a domicilio</span>
                </label>

                {formData.shipping_enabled && (
                  <div className="space-y-4 pt-2 border-t border-gray-900 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Costo de envío (MXN)</label>
                      <input
                        type="number"
                        name="shipping_price"
                        value={formData.shipping_price}
                        onChange={handleInputChange}
                        placeholder="200.00"
                        className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-2 focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Detalles o Plazos de Envío</label>
                      <textarea
                        name="shipping_details"
                        value={formData.shipping_details}
                        onChange={handleInputChange}
                        rows="2"
                        placeholder="Ej: Se envía por DHL 5 días hábiles después del evento."
                        className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-2 focus:outline-none text-xs resize-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Detalles de Entrega / Recoger en Persona</label>
                  <textarea
                    name="pickup_details"
                    value={formData.pickup_details}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Ej: Recoger en el hotel sede el viernes de 17:00 a 20:00 hrs."
                    className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-2 focus:outline-none text-xs resize-none"
                  />
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Imágenes del Producto</label>
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-800 border-dashed rounded-xl hover:border-blue-500 hover:bg-gray-950 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-xs text-gray-400 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer font-semibold text-blue-400 hover:text-blue-300">
                        <span>Sube imágenes</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Previews grid */}
                {(existingImages.length > 0 || previews.length > 0) && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {/* Existing images */}
                    {existingImages.map((src, index) => (
                      <div key={`existing-${index}`} className="relative group rounded-lg overflow-hidden border border-gray-800 aspect-square">
                        <img src={src} alt="Existing" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="bg-red-600 text-white p-1.5 rounded-full text-xs hover:bg-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* New previews */}
                    {previews.map((src, index) => (
                      <div key={`new-${index}`} className="relative group rounded-lg overflow-hidden border border-gray-800 aspect-square">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeNewFile(index)}
                            className="bg-red-600 text-white p-1.5 rounded-full text-xs hover:bg-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 px-6 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES INSPECTION MODAL */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowSalesModal(false)} />
          <div className="relative w-full max-w-5xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight truncate max-w-md">
                  Ventas: {inspectingProduct?.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">Inspección de ventas acumuladas en inscripciones y compras directas.</p>
              </div>
              <button onClick={() => setShowSalesModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingSales ? (
                <div className="flex justify-center p-12 text-gray-400">Cargando transacciones…</div>
              ) : sales.length === 0 ? (
                <div className="text-center p-12 text-gray-400 bg-gray-950 border border-gray-850 rounded-xl">
                  Aún no se registran compras para este artículo.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPI cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-950 border border-gray-850 p-4 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Unidades Vendidas</span>
                      <h4 className="text-2xl font-black text-white mt-1">
                        {sales.reduce((sum, item) => sum + item.quantity, 0)} u.
                      </h4>
                    </div>
                    <div className="bg-gray-950 border border-gray-850 p-4 rounded-xl">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Ingresos Brutos</span>
                      <h4 className="text-2xl font-black text-emerald-400 mt-1">
                        {centsToMoney(sales.reduce((sum, item) => sum + item.total_cents, 0))}
                      </h4>
                    </div>
                    <div className="bg-gray-950 border border-gray-850 p-4 rounded-xl flex items-center justify-center">
                      <button
                        onClick={handleExportSales}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs transition duration-200"
                      >
                        Exportar a CSV
                      </button>
                    </div>
                  </div>

                  {/* Sales Table */}
                  <div className="border border-gray-850 rounded-xl overflow-hidden">
                    <table className="min-w-full text-xs text-left bg-gray-950">
                      <thead className="bg-gray-900 border-b border-gray-850 text-gray-300 font-bold">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Comprador</th>
                          <th className="px-4 py-3">Cant.</th>
                          <th className="px-4 py-3">Monto</th>
                          <th className="px-4 py-3">Entrega</th>
                          <th className="px-4 py-3">Dirección</th>
                          <th className="px-4 py-3">Campos Personalizados</th>
                          <th className="px-4 py-3 text-right">Canal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-gray-300">
                        {sales.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(item.created_at).toLocaleString('es-MX')}
                            </td>
                            <td className="px-4 py-3">
                              <span className="block font-bold text-white">{item.buyer_name}</span>
                              <span className="text-[10px] text-gray-400">{item.buyer_email}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{item.quantity}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-emerald-400 font-bold">
                              {centsToMoney(item.total_cents)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.delivery_method === 'ship' 
                                  ? 'bg-blue-900/30 text-blue-300 border border-blue-800/40' 
                                  : 'bg-amber-900/30 text-amber-300 border border-amber-800/40'
                              }`}>
                                {item.delivery_method === 'ship' ? 'Envío' : 'Pickup'}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate" title={item.shipping_address}>
                              {item.shipping_address || '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] max-w-[200px] truncate" title={JSON.stringify(item.answers)}>
                              {Object.keys(item.answers).length > 0 ? (
                                Object.entries(item.answers).map(([key, val]) => `${key}: ${val}`).join(' | ')
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 whitespace-nowrap">{item.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-950 border-t border-gray-850 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSalesModal(false)}
                className="bg-gray-900 hover:bg-gray-850 border border-gray-800 px-6 py-2 rounded-xl text-sm font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
