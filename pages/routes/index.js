import Head from 'next/head'
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes } from "../../store/atoms/global";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "../../utils/supabase";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import { SideNavCollapsed } from "../../store/atoms/global";

const RouteBuilder = () => {
    const isOpen = useRecoilValue(SideNavCollapsed);
    const [routes, setRoutes] = useRecoilState(Routes);
    const currentRoute = useRecoilValue(CurrentRoute);
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const [checkpoints, setCheckpoints] = useState([]);
    const supabase = getSupabase();

    // Fetch routes and checkpoints
    const getCheckpoints = useCallback(async () => {
        if (currentRoute?.id) {
            try {
                const { data, error } = await supabase
                    .from('event_checkpoints')
                    .select('id, checkpoint_id, checkpoints(name, lat, lng, description, points, icon, terrain, weakSignal, picture)')
                    .eq('event_id', currentRoute.id);

                if (data) {
                    setCheckpoints(data);
                }
            } catch (e) {
                console.error("Error fetching checkpoints", e);
                setCheckpoints([]);
            }
        }
    }, [currentRoute]);

    useEffect(() => {
        getCheckpoints();
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
                    order: updatedCheckpoint.order,
                    weakSignal: updatedCheckpoint.weakSignal,
                })
                .eq('id', checkpoint.checkpoint_id);  // Use checkpoint_id from the parent object

            if (error) {
                console.error("Error saving checkpoint:", error);
            } else {
                alert("Cambios guardados exitosamente.");
            }
        } catch (e) {
            console.error("Error updating checkpoint", e);
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
                console.error("Error uploading image:", error);
                return;
            }

            // Save the image URL to the 'picture' column in the 'checkpoints' table
            const { error: updateError } = await supabase
                .from('checkpoints')
                .update({ picture: fileName })  // Update the 'picture' column
                .eq('id', checkpoint.checkpoint_id);  // Use checkpoint_id to identify the row

            if (updateError) {
                console.error("Error updating checkpoint with image:", updateError);
            } else {
                alert("Imagen subida exitosamente.");
                getCheckpoints(); // Refresh checkpoints after successful upload
            }
        } catch (e) {
            console.error("Error uploading image", e);
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

                                <h2 className="text-center mt-6">Constructor de Rutas</h2>

                                <div className="container mx-auto mt-4">
                                    {/* Add the following div to enable horizontal scrolling */}
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
                                                    <th>Imagen</th>
                                                    <th>Ver</th>
                                                    <th>Guardar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
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