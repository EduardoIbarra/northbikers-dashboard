import Head from 'next/head'
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes } from "../../store/atoms/global";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "../../utils/supabase";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import { SideNavCollapsed } from "../../store/atoms/global";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    const supabase = getSupabase();

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
                    hideProgressBar: false, // Show a progress bar
                    closeOnClick: true, // Close the toast when clicked
                    pauseOnHover: true, // Pause timer on hover
                    draggable: true, // Allow drag-and-drop dismiss
                    progress: undefined, // Use the default progress bar styling
                  });
                getCheckpoints(); // Refresh checkpoints after successful upload
            }
        } catch (e) {
            toast.error("Error uploading image", e);
        }
    };

    return (
        <>
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
                <div className="wrapper">
                    <Sidebar />
                    <div className="main w-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
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
                                <div className="container mx-auto mt-4">
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
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, name: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.lat}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, lat: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.lng}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, lng: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={newCheckpoint.description}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, description: e.target.value })
                                                            }
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={newCheckpoint.points}
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
                                                            <input type="file" onChange={(e) => handleImageUpload(e, cp)} />
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