import Head from 'next/head'
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes } from "../../store/atoms/global";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "../../utils/supabase";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import { SideNavCollapsed } from "../../store/atoms/global";
import { toast, ToastContainer } from 'react-toastify';
// import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import 'react-toastify/dist/ReactToastify.css';
import dynamic from "next/dynamic";
// Import ReactQuill dynamically with SSR disabled
const ReactQuill = dynamic(() => import("react-quill"), {
    ssr: false,
    loading: () => <p>Loading editor...</p> // Optional loading message
});
const RouteBuilder = () => {
    const isOpen = useRecoilValue(SideNavCollapsed);
    const [routes, setRoutes] = useRecoilState(Routes);
    const currentRoute = useRecoilValue(CurrentRoute);
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const [checkpoints, setCheckpoints] = useState([]);
    const [categories, setCategories] = useState([]);
    const [newCheckpoint, setNewCheckpoint] = useState({
        name: '',
        lat: '',
        lng: '',
        description: '',
        points: 0,
        challenge: false,
        terrain: 'pavement',
        weakSignal: false,
        picture: '',
    });
    const [routeAttributes, setRouteAttributes] = useState({
        title: "",
        venue: "",
        dates: "",
        description: "",
        long_description: "",
        en_long_description: "",
        venue_link: "",
        whatsapp_group_url: "",
        venue_iframe: "",
        start_timestamp: "",
        end_timestamp: "",
    });
    const supabase = getSupabase();

    // Preload route data
    const preloadRouteData = async () => {
        if (!currentRoute?.id) return;

        try {
            const { data, error } = await supabase
                .from("routes")
                .select(
                    "title, venue, dates, description, long_description, en_long_description, venue_link, whatsapp_group_url, venue_iframe, start_timestamp, end_timestamp"
                )
                .eq("id", currentRoute.id)
                .single();

            if (error) {
                toast.error("Error loading route data:", error);
                return;
            }

            // Update the state with fetched data
            setRouteAttributes({
                title: data.title || "",
                venue: data.venue || "",
                dates: data.dates || "",
                description: data.description || "",
                long_description: data.long_description || "",
                en_long_description: data.en_long_description || "",
                venue_link: data.venue_link || "",
                whatsapp_group_url: data.whatsapp_group_url || "",
                venue_iframe: data.venue_iframe || "",
                start_timestamp: data.start_timestamp || "",
                end_timestamp: data.end_timestamp || "",
            });
        } catch (e) {
            toast.error("Unexpected error loading route data:", e);
        }
    };

    useEffect(() => {
        preloadRouteData();
    }, [currentRoute]);

    // Handle field updates
    const handleInputChange = (key, value) => {
        setRouteAttributes((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveAttribute = async (key, value) => {
        try {
            const { error } = await supabase
                .from("routes")
                .update({ [key]: value })
                .eq("id", currentRoute.id);

            if (error) {
                toast.error(`Error saving ${key}:`, error);
            } else {
                toast.success(`"${key}" saved successfully!`);
            }
        } catch (e) {
            toast.error(`Unexpected error saving ${key}:`, e);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from('checkpoint_categories')
                .select('id, name');

            if (categoryError) {
                toast.error("Error fetching categories:", categoryError);
            } else {
                console.log("Fetched categories:", categoryData); // Add this line for debugging
                setCategories(categoryData);
            }
        } catch (error) {
            toast.error("Unexpected error fetching categories:", error);
        }
    };

    // Fetch routes and checkpoints
    const getCheckpoints = useCallback(async () => {
        if (currentRoute?.id) {
            try {
                const { data, error } = await supabase
                    .from('event_checkpoints')
                    .select('id, checkpoint_id, checkpoints(name, lat, lng, description, points, icon, terrain, weakSignal, picture, category_id)')
                    .eq('event_id', currentRoute.id);

                if (data) {
                    setCheckpoints(data);
                }
            } catch (e) {
                toast.error("Error fetching checkpoints", e);
                setCheckpoints([]);
            }
        }
    }, [currentRoute]);

    useEffect(() => {
        getCheckpoints();
        fetchCategories();
    }, [currentRoute, getCheckpoints]);

    const handleSaveCheckpoint = async (checkpoint) => {
        try {
            // Extract the nested checkpoint data
            const updatedCheckpoint = checkpoint.checkpoints;

            const { error } = await supabase
                .from('checkpoints')
                .update({
                    name: updatedCheckpoint.name,
                    lat: updatedCheckpoint.lat,
                    lng: updatedCheckpoint.lng,
                    description: updatedCheckpoint.description,
                    points: updatedCheckpoint.points,
                    icon: updatedCheckpoint.challenge
                        ? "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png"
                        : "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/road.png",
                    terrain: updatedCheckpoint.terrain,
                    weakSignal: updatedCheckpoint.weakSignal,
                    is_challenge: updatedCheckpoint.challenge,
                    category_id: updatedCheckpoint.category,  // Ensure category is included here
                })
                .eq('id', checkpoint.checkpoint_id);  // Use checkpoint_id from the parent object

            if (error) {
                toast.error("Error saving checkpoint:", error);
            } else {
                toast.success("Cambios guardados exitosamente.");
            }
        } catch (e) {
            toast.error("Error updating checkpoint", e);
        }
    };

    const handleSaveNewCheckpoint = async () => {
        try {
            // Insert the new checkpoint into the checkpoints table
            const { data: newCheckpointData, error: newCheckpointError } = await supabase
                .from('checkpoints')
                .insert({
                    name: newCheckpoint.name,
                    lat: newCheckpoint.lat,
                    lng: newCheckpoint.lng,
                    description: newCheckpoint.description,
                    points: newCheckpoint.points,
                    icon: newCheckpoint.challenge
                        ? "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png"
                        : "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/road.png",
                    terrain: newCheckpoint.terrain,
                    weakSignal: newCheckpoint.weakSignal,
                })
                .select('id');  // Select the ID of the newly inserted checkpoint

            if (newCheckpointError) {
                toast.error("Error saving new checkpoint:", newCheckpointError);
                return;
            }

            // Get the ID of the newly created checkpoint
            const newCheckpointId = newCheckpointData[0].id;

            // Insert a record into the event_checkpoints table to associate the checkpoint with the current route
            const { error: eventCheckpointError } = await supabase
                .from('event_checkpoints')
                .insert({
                    event_id: currentRoute.id,  // Tie the checkpoint to the current route
                    checkpoint_id: newCheckpointId,  // Use the newly created checkpoint ID
                });

            if (eventCheckpointError) {
                toast.error("Error inserting into event_checkpoints:", eventCheckpointError);
                return;
            }

            toast.success("Nuevo checkpoint creado y asociado exitosamente.");

            // Reset the form and refresh the checkpoints list
            setNewCheckpoint({
                name: '',
                lat: '',
                lng: '',
                description: '',
                points: 0,
                challenge: false,
                terrain: 'pavement',
                weakSignal: false,
                picture: '',
            });

            getCheckpoints(); // Refresh the checkpoints after adding a new one
        } catch (e) {
            toast.error("Error creating new checkpoint and associating it with the route", e);
        }
    };

    const handleImageUpload = async (e, checkpoint) => {
        const file = e.target.files[0];
        const fileName = `pictures/checkpoint/${Date.now()}.jpg`;

        try {
            // Upload the image to Supabase storage
            const { data, error } = await supabase.storage
                .from('pictures')
                .upload(fileName, file);

            if (error) {
                toast.error("Error uploading image:", error);
                return;
            }

            // Save the image URL to the 'picture' column in the 'checkpoints' table
            const { error: updateError } = await supabase
                .from('checkpoints')
                .update({ picture: fileName })  // Update the 'picture' column
                .eq('id', checkpoint.checkpoint_id);  // Use checkpoint_id to identify the row

            if (updateError) {
                toast.error("Error updating checkpoint with image:", updateError);
            } else {
                toast.success("Imagen subida exitosamente.", {
                    position: "top-right", // Position the toast at the top-right corner
                    autoClose: 3000, // Automatically close after 3 seconds
                });
                getCheckpoints(); // Refresh checkpoints after successful upload
            }
        } catch (e) {
            toast.error("Error uploading image", e);
        }
    };

    const downloadCheckpointsCSV = () => {
        const headers = [
            "ID", "Nombre", "Latitud", "Longitud", "Descripción", "Puntos",
            "Es Reto", "Terreno", "Señal Débil", "Categoría", "Imagen"
        ];

        const rows = checkpoints.map(cp => {
            const c = cp.checkpoints;
            return [
                cp.checkpoint_id,
                c.name,
                c.lat,
                c.lng,
                c.description,
                c.points,
                c.icon.includes("challenges.png") ? "Sí" : "No",
                c.terrain,
                c.weakSignal ? "Sí" : "No",
                c.category_id ?? "",
                c.picture ?? ""
            ];
        });

        const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `checkpoints_${currentRoute?.slug ?? "ruta"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <ToastContainer></ToastContainer>
            <Head>
                <title>North Bikers</title>
            </Head>
            <div
                data-layout="layout-1"
                data-collapsed={isOpen}
                data-background="light"
                data-navbar="light"
                data-left-sidebar="light"
                data-right-sidebar="light"
                className='font-sans antialiased text-sm disable-scrollbars'>
                <div className="flex h-screen bg-gray-900 text-gray-100">
                    <Sidebar />
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-800">
                        <Navbar />
                        <div className="min-h-screen w-full p-4">
                            <div className="route-builder">
                                {/* <h2 className="text-center mt-6">Constructor de Rutas {currentRoute.title}</h2> */}
                                <div className="text-center mt-6">
                                    <a
                                        href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=https://www.northbikers.com/${currentRoute.slug}`}
                                        target="_blank"
                                        download={`qr-${currentRoute.slug}.png`}
                                        className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition duration-300 ease-in-out"
                                    >
                                        Descargar QR para este evento
                                    </a>
                                </div>



                                <div className="p-4">
                                    <h2 className="text-2xl font-bold mb-4">Actualizar Atributos de la Ruta</h2>

                                    {/* Title */}
                                    <div className="mb-4">
                                        <label className="block font-bold text-gray-100">Título</label>
                                        <input
                                            type="text"
                                            value={routeAttributes.title}
                                            onChange={(e) => handleInputChange("title", e.target.value)}
                                            className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("title", routeAttributes.title)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Título
                                        </button>
                                    </div>

                                    {/* Venue */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Sede</label>
                                        <input
                                            type="text"
                                            value={routeAttributes.venue}
                                            onChange={(e) => handleInputChange("venue", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("venue", routeAttributes.venue)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Sede
                                        </button>
                                    </div>

                                    {/* Dates */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Fechas (Texto)</label>
                                        <input
                                            type="text"
                                            value={routeAttributes.dates}
                                            onChange={(e) => handleInputChange("dates", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("dates", routeAttributes.dates)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Fechas
                                        </button>
                                    </div>

                                    {/* Long Description */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Descripción Larga</label>
                                        <ReactQuill
                                            value={routeAttributes.long_description}
                                            onChange={(value) => handleInputChange("long_description", value)}
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("long_description", routeAttributes.long_description)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Descripción Larga
                                        </button>
                                    </div>

                                    {/* English Long Description */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Descripción Larga (Inglés)</label>
                                        <ReactQuill
                                            value={routeAttributes.en_long_description}
                                            onChange={(value) => handleInputChange("en_long_description", value)}
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("en_long_description", routeAttributes.en_long_description)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Descripción Larga (Inglés)
                                        </button>
                                    </div>

                                    {/* Venue Link */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Enlace del Lugar</label>
                                        <input
                                            type="text"
                                            value={routeAttributes.venue_link}
                                            onChange={(e) => handleInputChange("venue_link", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("venue_link", routeAttributes.venue_link)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Enlace
                                        </button>
                                    </div>

                                    {/* Venue Link */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Enlace del Grupo de WhatsApp</label>
                                        <input
                                            type="text"
                                            value={routeAttributes.whatsapp_group_url}
                                            onChange={(e) => handleInputChange("whatsapp_group_url", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("whatsapp_group_url", routeAttributes.whatsapp_group_url)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Grupo de WhatsApp
                                        </button>
                                    </div>


                                    {/* Venue Iframe */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Iframe del Lugar</label>
                                        <textarea
                                            value={routeAttributes.venue_iframe}
                                            onChange={(e) => handleInputChange("venue_iframe", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("venue_iframe", routeAttributes.venue_iframe)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Iframe
                                        </button>
                                    </div>

                                    {/* Start Timestamp */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Inicio</label>
                                        <input
                                            type="datetime-local"
                                            value={routeAttributes.start_timestamp}
                                            onChange={(e) => handleInputChange("start_timestamp", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("start_timestamp", routeAttributes.start_timestamp)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Inicio
                                        </button>
                                    </div>

                                    {/* End Timestamp */}
                                    <div className="mb-4">
                                        <label className="block font-bold">Fin</label>
                                        <input
                                            type="datetime-local"
                                            value={routeAttributes.end_timestamp}
                                            onChange={(e) => handleInputChange("end_timestamp", e.target.value)}
                                            className="bg-gray-700 border p-2 w-full"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute("end_timestamp", routeAttributes.end_timestamp)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Fin
                                        </button>
                                    </div>
                                </div>




                                <div className="container mx-auto mt-4">
                                    <div className="text-right mb-4">
                                        <button
                                            onClick={downloadCheckpointsCSV}
                                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-300"
                                        >
                                            Descargar Checkpoints en CSV
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="table-auto w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Nombre</th>
                                                    <th>Latitud</th>
                                                    <th>Longitud</th>
                                                    <th>Descripción</th>
                                                    <th>Puntos</th>
                                                    <th>Reto</th>
                                                    <th>Terreno</th>
                                                    <th>Señal Débil</th>
                                                    <th>Categoría</th>
                                                    <th>Imagen</th>
                                                    <th>Ver</th>
                                                    <th>Guardar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* New Checkpoint Row */}
                                                <tr>
                                                    <td>Nuevo</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={newCheckpoint.name}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, name: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.lat}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, lat: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.lng}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, lng: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={newCheckpoint.description}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, description: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.points}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, points: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={newCheckpoint.challenge}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, challenge: e.target.checked })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={newCheckpoint.terrain}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, terrain: e.target.value })
                                                            }
                                                        >
                                                            <option value="pavement">Pavimento</option>
                                                            <option value="dirt">Terracería</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={newCheckpoint.weakSignal}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, weakSignal: e.target.checked })
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <select
                                                            value={newCheckpoint.category || ''} // Preselect existing category if present
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setCheckpoints((prev) =>
                                                                    prev.map((item, i) =>
                                                                        i === index ? { ...item, selectedCategory: e.target.value } : item
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <option value="">Seleccionar categoría</option>
                                                            {categories.map((category) => (
                                                                <option key={category.id} value={category.id}>
                                                                    {category.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td>
                                                        {/* Image upload logic can be added here if necessary */}
                                                    </td>
                                                    <td>
                                                    </td>
                                                    <td>
                                                        <button
                                                            style={{ backgroundColor: 'black', color: 'white', padding: '8px 16px', borderRadius: '4px' }}
                                                            onClick={handleSaveNewCheckpoint}>
                                                            Guardar
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Existing Checkpoints */}
                                                {checkpoints.map((cp, index) => (
                                                    <tr key={cp.id}>
                                                        <td>{cp.checkpoint_id}</td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={cp.checkpoints.name}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, name: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={cp.checkpoints.lat}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, lat: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={cp.checkpoints.lng}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, lng: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={cp.checkpoints.description}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, description: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={cp.checkpoints.points}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, points: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={cp.checkpoints.icon === 'https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png'} // Ensuring it's a boolean
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, challenge: e.target.checked } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={cp.checkpoints.terrain}
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, terrain: e.target.value } } : item
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <option value="pavement">Pavimento</option>
                                                                <option value="dirt">Terracería</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                className='bg-gray-700'
                                                                checked={cp.checkpoints.weakSignal}
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, weakSignal: e.target.checked } } : item
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <select
                                                                value={cp.checkpoints.category_id || ''}  // Preselect existing category using category_id
                                                                className='bg-gray-700'
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index
                                                                                ? {
                                                                                    ...item,
                                                                                    checkpoints: {
                                                                                        ...item.checkpoints,
                                                                                        category_id: e.target.value,  // Update category_id directly
                                                                                    },
                                                                                }
                                                                                : item
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                <option value="">Seleccionar categoría</option>
                                                                {categories.map((category) => (
                                                                    <option key={category.id} value={category.id}>
                                                                        {category.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>



                                                        <td>
                                                            <input type="file" className='bg-gray-700' onChange={(e) => handleImageUpload(e, cp)} />
                                                        </td>

                                                        <td>
                                                            {cp.checkpoints.picture && cp.checkpoints.picture.trim() ? (
                                                                <a
                                                                    href={`https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/${cp.checkpoints.picture}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    <img
                                                                        src="https://cdn-icons-png.flaticon.com/512/4598/4598380.png"  // Example picture icon
                                                                        alt="View Picture"
                                                                        style={{ width: "24px", height: "24px" }}
                                                                    />
                                                                </a>
                                                            ) : null}
                                                        </td>

                                                        <td>
                                                            <button style={{ backgroundColor: 'black', color: 'white', padding: '8px 16px', borderRadius: '4px' }}
                                                                onClick={() => handleSaveCheckpoint(cp)}>
                                                                Guardar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RouteBuilder;