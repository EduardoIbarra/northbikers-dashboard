import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import moment from 'moment-timezone';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-quill/dist/quill.snow.css';
import { getSupabase } from '../../utils/supabase';
import { getLoggedUser } from '../../utils';

// Premium icons from react-icons (Hi2 / Fi / Md / Bs)
import { 
    HiOutlineMapPin, 
    HiOutlineDocumentText, 
    HiOutlineCalendarDays, 
    HiOutlineMap, 
    HiOutlineDocumentDuplicate, 
    HiOutlinePhoto, 
    HiOutlineCog6Tooth, 
    HiOutlineQuestionMarkCircle, 
    HiOutlineFlag,
    HiOutlineArrowLeft,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineCloudArrowUp
} from 'react-icons/hi2';

const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <p className="text-gray-500">Cargando editor...</p>
});

// Comprehensive list of Mexican states & cities with timezones
const MEXICAN_LOCATIONS = [
    { state: 'Nuevo León', city: 'Monterrey', tz: 'America/Monterrey' },
    { state: 'CDMX', city: 'Ciudad de México', tz: 'America/Mexico_City' },
    { state: 'Jalisco', city: 'Guadalajara', tz: 'America/Mexico_City' },
    { state: 'Guanajuato', city: 'León', tz: 'America/Mexico_City' },
    { state: 'Guanajuato', city: 'Guanajuato', tz: 'America/Mexico_City' },
    { state: 'Chiapas', city: 'Tuxtla Gutiérrez', tz: 'America/Mexico_City' },
    { state: 'Coahuila', city: 'Saltillo', tz: 'America/Monterrey' },
    { state: 'Coahuila', city: 'Torreón', tz: 'America/Monterrey' },
    { state: 'Baja California', city: 'Tijuana', tz: 'America/Tijuana' },
    { state: 'Baja California', city: 'Ensenada', tz: 'America/Tijuana' },
    { state: 'Baja California Sur', city: 'La Paz', tz: 'America/Mazatlan' },
    { state: 'Chihuahua', city: 'Chihuahua', tz: 'America/Chihuahua' },
    { state: 'Chihuahua', city: 'Ciudad Juárez', tz: 'America/Ciudad_Juarez' },
    { state: 'Sonora', city: 'Hermosillo', tz: 'America/Hermosillo' },
    { state: 'Sinaloa', city: 'Culiacán', tz: 'America/Mazatlan' },
    { state: 'Sinaloa', city: 'Mazatlán', tz: 'America/Mazatlan' },
    { state: 'Querétaro', city: 'Querétaro', tz: 'America/Mexico_City' },
    { state: 'Puebla', city: 'Puebla', tz: 'America/Mexico_City' },
    { state: 'Veracruz', city: 'Veracruz', tz: 'America/Mexico_City' },
    { state: 'Yucatán', city: 'Mérida', tz: 'America/Merida' },
    { state: 'Quintana Roo', city: 'Cancún', tz: 'America/Cancun' },
    { state: 'San Luis Potosí', city: 'San Luis Potosí', tz: 'America/Mexico_City' },
    { state: 'Tamaulipas', city: 'Reynosa', tz: 'America/Monterrey' },
    { state: 'Tamaulipas', city: 'Tampico', tz: 'America/Monterrey' },
    { state: 'Michoacán', city: 'Morelia', tz: 'America/Mexico_City' },
    { state: 'Oaxaca', city: 'Oaxaca', tz: 'America/Mexico_City' },
];

const CATEGORY_OPTIONS = [
    { id: 'DUAL_SPORT', label: 'Dual Purpose / ADV' },
    { id: 'DIRT', label: 'Dirt' },
    { id: 'STREET', label: 'Street' },
    { id: 'SPORT', label: 'Sport' },
    { id: 'NO', label: 'No Categoría' }
];

export default function CreateRoutePage() {
    const router = useRouter();
    const supabase = getSupabase();
    const [loggedUser, setLoggedUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Location & Timezone
    const [selectedState, setSelectedState] = useState('Nuevo León');
    const [selectedLocation, setSelectedLocation] = useState(MEXICAN_LOCATIONS[0]);

    // Form attributes
    const [formData, setFormData] = useState({
        title: '',
        amount: 0,
        couple_price: 0,
        description: '',
        long_description: '',
        en_long_description: '',
        dates: '',
        start_date_local: '',
        start_time_local: '08:00',
        end_date_local: '',
        end_time_local: '18:00',
        venue: '',
        venue_link: '',
        venue_iframe: '',
        whatsapp_group_url: '',
        instructions: '',
        banner: '',
        banner_h: '',
        cover: '',
        logo: '',
        rules_file: '',
        terms_file: '',
        rally: true,
        featured: false,
        pinned: false,
        active: true,
        purchase_available: true,
        jersey_option: false,
        categoriesList: ['DUAL_SPORT', 'DIRT', 'STREET'],
    });

    // FAQ builder state
    const [faqList, setFaqList] = useState([
        { q: '¿Cuál es el punto de salida?', a: 'Se indicará a los participantes inscritos en el grupo de WhatsApp.' },
        { q: '¿Qué incluye la inscripción?', a: 'Acceso a la ruta en la app, parche oficial y souvenirs del evento.' }
    ]);

    // Checkpoint optional builder
    const [checkpoints, setCheckpoints] = useState([]);
    const [cpForm, setCpForm] = useState({
        name: '',
        lat: '',
        lng: '',
        description: '',
        points: 100,
        is_challenge: false,
        terrain: 'pavement',
        weakSignal: false
    });

    useEffect(() => {
        const fetchUser = async () => {
            const user = await getLoggedUser();
            setLoggedUser(user);
        };
        fetchUser();
    }, []);

    // Filter cities when state changes
    const availableCities = MEXICAN_LOCATIONS.filter(loc => loc.state === selectedState);

    const handleStateChange = (state) => {
        setSelectedState(state);
        const firstInState = MEXICAN_LOCATIONS.find(loc => loc.state === state);
        if (firstInState) setSelectedLocation(firstInState);
    };

    const handleCityChange = (cityName) => {
        const loc = MEXICAN_LOCATIONS.find(l => l.state === selectedState && l.city === cityName);
        if (loc) setSelectedLocation(loc);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'venue_link' && value && !prev.venue_iframe_manual) {
                updated.venue_iframe = generateVenueIframe(value);
            }
            return updated;
        });
    };

    // Venue Link -> venue_iframe generator
    const generateVenueIframe = (link) => {
        if (!link) return '';
        if (link.includes('<iframe') || link.includes('/embed')) {
            if (link.includes('<iframe')) {
                const match = link.match(/src=["']([^"']+)["']/);
                return match ? match[1] : link;
            }
            return link;
        }
        try {
            const encoded = encodeURIComponent(link);
            return `https://www.google.com/maps?q=${encoded}&output=embed`;
        } catch (e) {
            return link;
        }
    };

    // Auto slug generator
    const generateSlug = (title) => {
        const base = title
            .toLowerCase()
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");
        const hash = Math.random().toString(36).substring(2, 8);
        return base ? `${base}-${hash}` : `route-${hash}`;
    };

    // FAQ Handlers
    const handleFaqChange = (index, field, value) => {
        setFaqList(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addFaqItem = () => {
        setFaqList(prev => [...prev, { q: '', a: '' }]);
    };

    const removeFaqItem = (index) => {
        setFaqList(prev => prev.filter((_, i) => i !== index));
    };

    // Category Handlers
    const toggleCategory = (catId) => {
        setFormData(prev => {
            const current = prev.categoriesList;
            if (current.includes(catId)) {
                return { ...prev, categoriesList: current.filter(c => c !== catId) };
            } else {
                return { ...prev, categoriesList: [...current, catId] };
            }
        });
    };

    // Checkpoint Handlers
    const addCheckpoint = () => {
        if (!cpForm.name || !cpForm.lat || !cpForm.lng) {
            toast.error("El checkpoint requiere al menos nombre, latitud y longitud.");
            return;
        }
        setCheckpoints(prev => [...prev, { ...cpForm, id: Date.now() }]);
        setCpForm({
            name: '',
            lat: '',
            lng: '',
            description: '',
            points: 100,
            is_challenge: false,
            terrain: 'pavement',
            weakSignal: false
        });
        toast.success("Checkpoint agregado a la lista previa.");
    };

    const removeCheckpoint = (id) => {
        setCheckpoints(prev => prev.filter(c => c.id !== id));
    };

    // File Upload helper to Supabase Storage
    const handleFileUpload = async (file, folder, targetField) => {
        if (!file) return;
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('pictures')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                toast.error(`Error al subir archivo: ${uploadError.message}`);
                return;
            }

            const publicUrl = `https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/${fileName}`;
            handleInputChange(targetField, publicUrl);
            toast.success(`Archivo cargado correctamente.`);
        } catch (e) {
            toast.error("Error al procesar la carga del archivo.");
        }
    };

    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            toast.error("El título de la ruta es obligatorio.");
            return;
        }

        setIsSaving(true);

        try {
            let startTimestamp = null;
            let endTimestamp = null;

            if (formData.start_date_local) {
                const startStr = `${formData.start_date_local} ${formData.start_time_local}`;
                startTimestamp = moment.tz(startStr, 'YYYY-MM-DD HH:mm', selectedLocation.tz).toISOString();
            } else {
                startTimestamp = new Date().toISOString();
            }

            if (formData.end_date_local) {
                const endStr = `${formData.end_date_local} ${formData.end_time_local}`;
                endTimestamp = moment.tz(endStr, 'YYYY-MM-DD HH:mm', selectedLocation.tz).toISOString();
            }

            const categoriesStr = formData.categoriesList.length > 0
                ? formData.categoriesList.join(',')
                : null;

            const cleanFaq = faqList.filter(f => f.q.trim() && f.a.trim());
            const generatedSlug = generateSlug(formData.title);

            const routePayload = {
                title: formData.title,
                amount: Number(formData.amount) || 0,
                couple_price: Number(formData.couple_price) || 0,
                description: formData.description,
                long_description: formData.long_description,
                en_long_description: formData.en_long_description,
                dates: formData.dates || `${formData.start_date_local || ''} - ${formData.end_date_local || ''}`,
                start_timestamp: startTimestamp,
                end_timestamp: endTimestamp,
                venue: formData.venue,
                venue_link: formData.venue_link,
                venue_iframe: formData.venue_iframe || generateVenueIframe(formData.venue_link),
                whatsapp_group_url: formData.whatsapp_group_url,
                instructions: formData.instructions,
                banner: formData.banner,
                banner_h: formData.banner_h,
                cover: formData.cover,
                logo: formData.logo,
                rules_file: formData.rules_file,
                terms_file: formData.terms_file,
                active: formData.active,
                rally: formData.rally,
                featured: formData.featured,
                pinned: formData.pinned,
                show_points: false,
                customer_id: 1,
                profile_id: loggedUser?.id || null,
                slug: generatedSlug,
                purchase_available: formData.purchase_available,
                jersey_option: formData.jersey_option,
                categories: categoriesStr,
                faq: cleanFaq.length > 0 ? cleanFaq : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: newRoute, error: routeError } = await supabase
                .from('routes')
                .insert(routePayload)
                .select('id')
                .single();

            if (routeError) {
                toast.error("Error al crear la ruta: " + routeError.message);
                setIsSaving(false);
                return;
            }

            const newRouteId = newRoute.id;

            if (checkpoints.length > 0) {
                for (let i = 0; i < checkpoints.length; i++) {
                    const cp = checkpoints[i];
                    const { data: cpData, error: cpErr } = await supabase
                        .from('checkpoints')
                        .insert({
                            name: cp.name,
                            lat: cp.lat,
                            lng: cp.lng,
                            description: cp.description,
                            points: Number(cp.points) || 100,
                            is_challenge: cp.is_challenge,
                            terrain: cp.terrain,
                            weakSignal: cp.weakSignal,
                            icon: cp.is_challenge
                                ? "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png"
                                : "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/road.png"
                        })
                        .select('id')
                        .single();

                    if (!cpErr && cpData) {
                        await supabase.from('event_checkpoints').insert({
                            event_id: newRouteId,
                            checkpoint_id: cpData.id,
                            order: i + 1
                        });
                    }
                }
            }

            toast.success(`¡Ruta "${formData.title}" creada con éxito (ID: ${newRouteId})!`);
            setTimeout(() => {
                router.push('/routes');
            }, 1500);

        } catch (e) {
            console.error("Error creating route:", e);
            toast.error("Error inesperado al crear la ruta.");
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-8 font-sans">
            <Head>
                <title>Crear Nueva Ruta / Rally - NorthBikers Dashboard</title>
            </Head>
            <ToastContainer theme="light" />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Navbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                    <div>
                        <div className="text-xs uppercase font-bold tracking-widest text-yellow-600 mb-1">
                            ADMINISTRACIÓN DE RUTAS
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
                            Crear Nueva Ruta / Rally
                        </h1>
                    </div>
                    <Link
                        href="/routes"
                        className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm self-start sm:self-auto"
                    >
                        <HiOutlineArrowLeft className="w-4 h-4" />
                        Volver a Rutas
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* SECTION 1: UBICACIÓN Y ZONA HORARIA */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineMapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">1. Ubicación y Zona Horaria</h2>
                                <p className="text-xs text-gray-500">Selecciona la ciudad del evento para guardar las fechas en la zona horaria oficial del lugar.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Estado</label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => handleStateChange(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                >
                                    {[...new Set(MEXICAN_LOCATIONS.map(l => l.state))].map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Ciudad del Evento</label>
                                <select
                                    value={selectedLocation.city}
                                    onChange={(e) => handleCityChange(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                >
                                    {availableCities.map(loc => (
                                        <option key={loc.city} value={loc.city}>{loc.city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Zona Horaria Aplicada</label>
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl px-4 py-3 text-xs font-mono font-bold flex items-center justify-between">
                                    <span>{selectedLocation.tz}</span>
                                    <HiOutlineCheckCircle className="w-4 h-4 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: INFORMACIÓN GENERAL Y PRECIOS */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineDocumentText className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">2. Información General y Precios</h2>
                                <p className="text-xs text-gray-500">Título, precios y descripción breve del evento.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                            <div className="sm:col-span-8">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Título de la Ruta / Rally *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Rally ADV Guanajuato 2026"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Precio Piloto ($MXN)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Precio Pareja ($MXN)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.couple_price}
                                    onChange={(e) => handleInputChange('couple_price', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-12">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Descripción Corta</label>
                                <textarea
                                    rows="2"
                                    placeholder="Resumen ejecutivo del evento para las tarjetas de presentación..."
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: FECHAS Y HORARIOS */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineCalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">3. Fechas y Horarios ({selectedLocation.city})</h2>
                                <p className="text-xs text-gray-500">Ingresa la fecha/hora local del evento; se convertirá automáticamente con la zona horaria {selectedLocation.tz}.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                            <div className="sm:col-span-6">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Texto Visible de Fechas (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Del 7 al 9 de Agosto, 2026"
                                    value={formData.dates}
                                    onChange={(e) => handleInputChange('dates', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Fecha Inicio Local</label>
                                <input
                                    type="date"
                                    value={formData.start_date_local}
                                    onChange={(e) => handleInputChange('start_date_local', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Hora Inicio Local</label>
                                <input
                                    type="time"
                                    value={formData.start_time_local}
                                    onChange={(e) => handleInputChange('start_time_local', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-6"></div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Fecha Fin Local</label>
                                <input
                                    type="date"
                                    value={formData.end_date_local}
                                    onChange={(e) => handleInputChange('end_date_local', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Hora Fin Local</label>
                                <input
                                    type="time"
                                    value={formData.end_time_local}
                                    onChange={(e) => handleInputChange('end_time_local', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: SEDE Y MAPA EMBEBIDO */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineMap className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">4. Sede y Mapa de Encuentro</h2>
                                <p className="text-xs text-gray-500">Lugar del evento, enlace de Google Maps y generación del mapa embebido.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                            <div className="sm:col-span-6">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Nombre del Lugar / Venue</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Hotel Corona & Spa, Ensenada"
                                    value={formData.venue}
                                    onChange={(e) => handleInputChange('venue', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-6">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Enlace de Google Maps (Venue Link)</label>
                                <input
                                    type="url"
                                    placeholder="https://maps.app.goo.gl/..."
                                    value={formData.venue_link}
                                    onChange={(e) => handleInputChange('venue_link', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div className="sm:col-span-12">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">
                                    Mapa Embebido (Iframe generado automáticamente)
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://www.google.com/maps?q=...&output=embed"
                                    value={formData.venue_iframe}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, venue_iframe: e.target.value, venue_iframe_manual: true }));
                                    }}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: DESCRIPCIONES DETALLADAS Y REGLAMENTO */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineDocumentDuplicate className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">5. Descripciones Extensas y Enlaces de Interés</h2>
                                <p className="text-xs text-gray-500">Contenido enriquecido en Español e Inglés, grupo de WhatsApp e instrucciones en PDF.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Grupo de WhatsApp (URL)</label>
                                <input
                                    type="url"
                                    placeholder="https://chat.whatsapp.com/..."
                                    value={formData.whatsapp_group_url}
                                    onChange={(e) => handleInputChange('whatsapp_group_url', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">PDF de Instrucciones (URL)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://.../instructions.pdf"
                                        value={formData.instructions}
                                        onChange={(e) => handleInputChange('instructions', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'instructions', 'instructions')}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Descripción Larga (Español)</label>
                            <div className="bg-white rounded-2xl text-gray-900 overflow-hidden border border-gray-300">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.long_description}
                                    onChange={(val) => handleInputChange('long_description', val)}
                                    className="min-h-[150px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Descripción Larga (Inglés)</label>
                            <div className="bg-white rounded-2xl text-gray-900 overflow-hidden border border-gray-300">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.en_long_description}
                                    onChange={(val) => handleInputChange('en_long_description', val)}
                                    className="min-h-[150px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6: IMÁGENES Y ARCHIVOS MULTIMEDIA */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlinePhoto className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">6. Banners, Covers y Documentos</h2>
                                <p className="text-xs text-gray-500">Subir o pegar URLs para los recursos gráficos y legales.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Banner Horizontal */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Banner Horizontal (banner_h)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL de banner horizontal"
                                        value={formData.banner_h}
                                        onChange={(e) => handleInputChange('banner_h', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'rallies', 'banner_h')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Banner Vertical */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Banner Principal (banner)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL de banner vertical"
                                        value={formData.banner}
                                        onChange={(e) => handleInputChange('banner', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'rallies', 'banner')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Portada (cover)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL de portada"
                                        value={formData.cover}
                                        onChange={(e) => handleInputChange('cover', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'rallies', 'cover')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Logo */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Logo del Evento (logo)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL del logo"
                                        value={formData.logo}
                                        onChange={(e) => handleInputChange('logo', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'rallies', 'logo')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Reglamento */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Archivo de Reglamento (rules_file)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL del reglamento PDF"
                                        value={formData.rules_file}
                                        onChange={(e) => handleInputChange('rules_file', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'rules', 'rules_file')}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Términos y Condiciones */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600">Términos y Condiciones (terms_file)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="URL de términos PDF"
                                        value={formData.terms_file}
                                        onChange={(e) => handleInputChange('terms_file', e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-yellow-500 focus:bg-white"
                                    />
                                    <label className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm">
                                        <HiOutlineCloudArrowUp className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e.target.files[0], 'terms', 'terms_file')}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 7: CONFIGURACIÓN, CATEGORÍAS Y SWITCHES */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineCog6Tooth className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">7. Configuración, Categorías y Opciones</h2>
                                <p className="text-xs text-gray-500">Selecciona categorías habilitadas y los estados de la ruta.</p>
                            </div>
                        </div>

                        {/* Categorías habilitadas */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Categorías de Motocicletas Habilitadas</label>
                            <div className="flex flex-wrap gap-3">
                                {CATEGORY_OPTIONS.map(cat => {
                                    const active = formData.categoriesList.includes(cat.id);
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                                                active
                                                    ? 'bg-yellow-500 text-black border-yellow-500 shadow-md'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-400'
                                            }`}
                                        >
                                            {active ? '✓ ' : '+ '}{cat.label} ({cat.id})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.rally}
                                    onChange={(e) => handleInputChange('rally', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Es Rally (rally)</span>
                                    <span className="text-[10px] text-gray-500">Habilita puntuación y mapa</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.jersey_option}
                                    onChange={(e) => handleInputChange('jersey_option', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Opción de Jersey</span>
                                    <span className="text-[10px] text-gray-500">Solicitar talla e impreso</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.purchase_available}
                                    onChange={(e) => handleInputChange('purchase_available', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Compra Disponible</span>
                                    <span className="text-[10px] text-gray-500">Permitir inscripciones</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={(e) => handleInputChange('active', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Ruta Activa</span>
                                    <span className="text-[10px] text-gray-500">Publicar en el sitio</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.featured}
                                    onChange={(e) => handleInputChange('featured', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Destacado (featured)</span>
                                    <span className="text-[10px] text-gray-500">Resaltar en portada</span>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.pinned}
                                    onChange={(e) => handleInputChange('pinned', e.target.checked)}
                                    className="h-5 w-5 text-yellow-500 rounded border-gray-300 bg-white focus:ring-0"
                                />
                                <div>
                                    <span className="block text-xs font-bold uppercase tracking-widest text-gray-900">Fijado (pinned)</span>
                                    <span className="text-[10px] text-gray-500">Fijar al inicio</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* SECTION 8: FAQ BUILDER */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                    <HiOutlineQuestionMarkCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">8. Constructor de FAQ (Preguntas Frecuentes)</h2>
                                    <p className="text-xs text-gray-500">Agrega preguntas y respuestas en formato JSON estructurado.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addFaqItem}
                                className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
                            >
                                <HiOutlinePlus className="w-4 h-4" />
                                Agregar FAQ
                            </button>
                        </div>

                        <div className="space-y-4">
                            {faqList.map((item, index) => (
                                <div key={index} className="bg-gray-50 border border-gray-200 p-4 sm:p-6 rounded-2xl space-y-3 relative">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-widest text-yellow-600">Pregunta #{index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFaqItem(index)}
                                            className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest"
                                        >
                                            <HiOutlineTrash className="w-4 h-4" />
                                            Eliminar
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="¿Qué pregunta tiene el rider? (Ej: ¿Habrá campamento?)"
                                        value={item.q}
                                        onChange={(e) => handleFaqChange(index, 'q', e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
                                    />
                                    <textarea
                                        rows="2"
                                        placeholder="Respuesta detallada..."
                                        value={item.a}
                                        onChange={(e) => handleFaqChange(index, 'a', e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECTION 9: CHECKPOINTS OPCIONALES */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                                <HiOutlineFlag className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">9. Checkpoints Iniciales (Opcional)</h2>
                                <p className="text-xs text-gray-500">Puedes agregar checkpoints iniciales ahora o agregarlos más tarde desde el constructor de rutas.</p>
                            </div>
                        </div>

                        {/* Form for new checkpoint */}
                        <div className="bg-gray-50 border border-gray-200 p-4 sm:p-6 rounded-2xl space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700">Nuevo Checkpoint Previo</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Nombre Checkpoint *"
                                    value={cpForm.name}
                                    onChange={(e) => setCpForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Latitud (lat) *"
                                    value={cpForm.lat}
                                    onChange={(e) => setCpForm(prev => ({ ...prev, lat: e.target.value }))}
                                    className="bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Longitud (lng) *"
                                    value={cpForm.lng}
                                    onChange={(e) => setCpForm(prev => ({ ...prev, lng: e.target.value }))}
                                    className="bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Descripción corta"
                                    value={cpForm.description}
                                    onChange={(e) => setCpForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 text-sm sm:col-span-2 focus:outline-none focus:border-yellow-500"
                                />
                                <input
                                    type="number"
                                    placeholder="Puntos"
                                    value={cpForm.points}
                                    onChange={(e) => setCpForm(prev => ({ ...prev, points: e.target.value }))}
                                    className="bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <label className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={cpForm.is_challenge}
                                        onChange={(e) => setCpForm(prev => ({ ...prev, is_challenge: e.target.checked }))}
                                        className="h-4 w-4 text-yellow-500 rounded border-gray-300 bg-white"
                                    />
                                    <span>Es Reto Especial</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addCheckpoint}
                                    className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm"
                                >
                                    <HiOutlinePlus className="w-4 h-4" />
                                    Añadir a la lista
                                </button>
                            </div>
                        </div>

                        {/* List of pending checkpoints */}
                        {checkpoints.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-600">Checkpoints a guardar ({checkpoints.length}):</h4>
                                <div className="space-y-2">
                                    {checkpoints.map((cp, idx) => (
                                        <div key={cp.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl text-xs border border-gray-200">
                                            <div>
                                                <span className="font-bold text-gray-900 mr-2">#{idx + 1} {cp.name}</span>
                                                <span className="text-gray-500 font-mono">({cp.lat}, {cp.lng}) - {cp.points} pts</span>
                                                {cp.is_challenge && <span className="ml-2 text-yellow-600 font-bold">[RETO]</span>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeCheckpoint(cp.id)}
                                                className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 font-bold"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
                                                Eliminar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="flex justify-end gap-4 pt-4">
                        <Link
                            href="/routes"
                            className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-yellow-500/20 transition-all ${
                                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            <HiOutlineCheckCircle className="w-5 h-5" />
                            {isSaving ? 'Guardando Ruta...' : 'Crear Ruta Ahora'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
