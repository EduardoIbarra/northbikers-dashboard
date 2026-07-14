import Head from 'next/head';
import { useCallback, useEffect, useState, useMemo } from "react";
import { getSupabase } from "../../utils/supabase";
import { getLoggedUser } from "../../utils";
import { useRouter } from "next/router";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import SectionTitle from "../../components/section-title";
import Widget from "../../components/widget";
import TextInput from "../../components/input";
import Button from "../../components/button";
import CheckpointsList from "./list";
import { useRecoilValue } from 'recoil';
import { CurrentRoute } from '../../store/atoms/global';

const CheckpointEditorPage = () => {
    const router = useRouter();
    const supabase = getSupabase();
    const loggedUser = getLoggedUser();

    const [isLoading, setLoading] = useState(true);
    const [isSaving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const currentRoute = useRecoilValue(CurrentRoute);
    const selectedRouteId = currentRoute?.id ?? 'all';
    
    const [routes, setRoutes] = useState([]);
    const [allCheckpoints, setAllCheckpoints] = useState([]);
    const [eventCheckpoints, setEventCheckpoints] = useState([]); // Array of { event_id, checkpoint_id }
    const [changedCheckpoints, setChangedCheckpoints] = useState({}); // { id: { visibility?: boolean, difficulty?: number | null } }

    // Check authentication
    useEffect(() => {
        if (!loggedUser) {
            router.push('/login');
        }
    }, [loggedUser, router]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch routes for the filter
            const { data: routesData, error: routesError } = await supabase
                .from("routes")
                .select("id, title")
                .order("title");
            
            if (routesError) throw routesError;
            setRoutes(routesData.map(r => ({ id: r.id, title: r.title })));

            // Fetch event_checkpoints mapping
            const { data: eventCpData, error: eventCpError } = await supabase
                .from("event_checkpoints")
                .select("event_id, checkpoint_id");
            
            if (eventCpError) throw eventCpError;
            setEventCheckpoints(eventCpData);

            // Fetch all checkpoints initially
            let query = supabase.from("checkpoints").select("*").order("id", { ascending: false });
            
            const { data: checkpointsData, error: checkpointsError } = await query;
            if (checkpointsError) throw checkpointsError;

            setAllCheckpoints(checkpointsData);
            setChangedCheckpoints({});
        } catch (e) {
            console.error("Error fetching data", e);
            toast.error("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtering logic
    const filteredData = useMemo(() => {
        let data = [...allCheckpoints];

        // Search filter
        if (searchQuery) {
            data = data.filter(cp => 
                cp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cp.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Route filter
        if (selectedRouteId !== 'all') {
            const checkpointIdsInRoute = eventCheckpoints
                .filter(ec => ec.event_id == selectedRouteId)
                .map(ec => ec.checkpoint_id);

            data = data.filter(cp => 
                cp.route_id == selectedRouteId || 
                checkpointIdsInRoute.includes(cp.id)
            );
        }

        // Apply local changes (not yet saved to DB)
        return data.map(cp => {
            const changes = changedCheckpoints[cp.id] || {};
            return {
                ...cp,
                visibility: changes.visibility !== undefined ? changes.visibility : cp.visibility,
                difficulty: changes.difficulty !== undefined ? changes.difficulty : cp.difficulty
            };
        });
    }, [allCheckpoints, searchQuery, selectedRouteId, changedCheckpoints]);

    const handleVisibilityChange = (id, newVisibility) => {
        setChangedCheckpoints(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                visibility: newVisibility
            }
        }));
    };

    const handleDifficultyChange = (id, newDifficulty) => {
        setChangedCheckpoints(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                difficulty: newDifficulty
            }
        }));
    };

    const handleSaveAll = async () => {
        const updates = Object.keys(changedCheckpoints);
        if (updates.length === 0) {
            toast.info("No hay cambios para guardar");
            return;
        }

        setSaving(true);
        try {
            // Supabase doesn't have a multi-row update with different values easily in a single RPC 
            // but we can do multiple updates or a single upsert if we have all columns.
            // Since we only want to update 'visibility', we'll do them in a loop or use a promise all.
            
            const updatePromises = updates.map(id => {
                const changes = changedCheckpoints[id];
                const updatePayload = {};
                if (changes.visibility !== undefined) updatePayload.visibility = changes.visibility;
                if (changes.difficulty !== undefined) updatePayload.difficulty = changes.difficulty;

                return supabase
                    .from("checkpoints")
                    .update(updatePayload)
                    .eq("id", id);
            });

            const results = await Promise.all(updatePromises);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) {
                console.error("Errors during bulk save", errors);
                toast.error(`Error al guardar ${errors.length} cambios`);
            } else {
                toast.success(`${updates.length} cambios guardados correctamente`);
                // Refresh data to sync with DB
                await fetchData();
            }
        } catch (e) {
            console.error("Save error", e);
            toast.error("Ocurrió un error inesperado al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (checkpoint) => {
        // Here we could open a modal or navigate to a detail page
        // For now, let's just log it
        console.log("Editing checkpoint", checkpoint);
        toast.info(`Edición para "${checkpoint.name}" no implementada aún`);
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);

            // 1. Obtener los IDs de event_checkpoints asociados a este checkpoint
            const { data: eventCps, error: fetchError } = await supabase
                .from("event_checkpoints")
                .select("id")
                .eq("checkpoint_id", id);

            if (fetchError) throw fetchError;

            if (eventCps && eventCps.length > 0) {
                const eventCpIds = eventCps.map(ecp => ecp.id);

                // 2. Eliminar referencias en profile_event_checkpoints primero
                const { error: profileCpError } = await supabase
                    .from("profile_event_checkpoints")
                    .delete()
                    .in("event_checkpoint_id", eventCpIds);

                if (profileCpError) throw profileCpError;

                // 3. Eliminar referencias en pick_checkpoints
                const { error: pickCpError } = await supabase
                    .from("pick_checkpoints")
                    .delete()
                    .in("event_checkpoint_id", eventCpIds);

                if (pickCpError) throw pickCpError;
            }
            
            // 4. Eliminar referencias en event_checkpoints
            const { error: eventCpError } = await supabase
                .from("event_checkpoints")
                .delete()
                .eq("checkpoint_id", id);
                
            if (eventCpError) throw eventCpError;

            // 5. Eliminar referencias en feeds
            const { error: feedsError } = await supabase
                .from("feeds")
                .delete()
                .eq("checkpoint_id", id);

            if (feedsError) throw feedsError;

            // 6. Eliminar referencias en check_ins
            const { error: checkinsError } = await supabase
                .from("check_ins")
                .delete()
                .eq("checkpoint_id", id);

            if (checkinsError) throw checkinsError;

            // 7. Eliminar el checkpoint
            const { error } = await supabase
                .from("checkpoints")
                .delete()
                .eq("id", id);
                
            if (error) throw error;
            
            toast.success("Checkpoint eliminado correctamente");
            await fetchData();
        } catch (e) {
            console.error("Error deleting checkpoint", e);
            toast.error("Error al eliminar el checkpoint");
            setLoading(false);
        }
    };

    if (!loggedUser) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Head>
                <title>Checkpoint Editor | NorthBikers</title>
            </Head>
            
            <ToastContainer theme="dark" />

            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex flex-row items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <div className="text-xs uppercase font-bold tracking-widest text-yellow-500 mb-2">
                            ADMINISTRACIÓN
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter">
                            Checkpoint Editor
                        </h1>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            className={`bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                            onClick={handleSaveAll}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </div>

                <div className="premium-card p-6 mb-8">
                    <div className="w-full">
                        <TextInput
                            label={'Búsqueda por Nombre'}
                            type='text'
                            placeholder='Buscar checkpoint...'
                            value={searchQuery}
                            onChange={setSearchQuery}
                            className="search-input-premium w-full"
                        />
                    </div>
                </div>

                <div className="premium-card overflow-hidden">
                    <div className='flex flex-col bg-transparent'>
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-neutral-900 rounded-t-[2.5rem]">
                            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                Mostrando <span className="text-yellow-500">{filteredData.length}</span> checkpoints
                            </div>
                            {Object.keys(changedCheckpoints).length > 0 && (
                                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">
                                    {Object.keys(changedCheckpoints).length} cambios pendientes
                                </div>
                            )}
                        </div>
                        <CheckpointsList 
                            isLoading={isLoading} 
                            data={filteredData} 
                            onVisibilityChange={handleVisibilityChange}
                            onDifficultyChange={handleDifficultyChange}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .premium-card {
                    background: rgba(23, 23, 23, 0.6);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .search-input-premium input {
                    background: #171717 !important;
                    border: 1px solid #262626 !important;
                    border-radius: 1rem !important;
                    color: white !important;
                }
                .search-input-premium input:focus {
                    border-color: #eab308 !important;
                    box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2) !important;
                }
            `}</style>
        </div>
    );
};

export default CheckpointEditorPage;
