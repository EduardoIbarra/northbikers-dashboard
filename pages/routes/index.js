// pages/routes/index.js
import Head from 'next/head'
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes } from "../../store/atoms/global";
import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "../../utils/supabase";
import { getLoggedUser } from "../../utils";
import { toast, ToastContainer } from 'react-toastify';
// import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import 'react-toastify/dist/ReactToastify.css';
import dynamic from "next/dynamic";
import Link from 'next/link';
import moment from 'moment-timezone';
// Import ReactQuill dynamically with SSR disabled
const ReactQuill = dynamic(() => import("react-quill"), {
    ssr: false,
    loading: () => <p>Loading editor...</p> // Optional loading message
});

const ROUTE_TIMEZONES = [
    { value: 'America/Monterrey', label: 'Monterrey, México (America/Monterrey)' },
    { value: 'America/Mexico_City', label: 'Ciudad de México (America/Mexico_City)' },
    { value: 'America/Cancun', label: 'Cancún (America/Cancun)' },
    { value: 'America/Merida', label: 'Mérida (America/Merida)' },
    { value: 'America/Chihuahua', label: 'Chihuahua (America/Chihuahua)' },
    { value: 'America/Ciudad_Juarez', label: 'Ciudad Juárez (America/Ciudad_Juarez)' },
    { value: 'America/Hermosillo', label: 'Hermosillo (America/Hermosillo)' },
    { value: 'America/Mazatlan', label: 'Mazatlán (America/Mazatlan)' },
    { value: 'America/Tijuana', label: 'Tijuana (America/Tijuana)' },
];

const DEFAULT_CHALLENGE_INSTRUCTIONS = 'Lee y sigue las instrucciones específicas del reto. Para validar los puntos, publica una foto (no una historia) en Facebook o Instagram, etiquetando las cuentas indicadas e incluyendo el hashtag requerido. Toma una captura donde se vean las etiquetas y el hashtag y súbela a NorthBikers. Sin señal, haz el check-in en modo offline y sube la foto cuando tengas conexión. En cada checkpoint y reto, incluye una selfie con tu buff o jersey visible, o con el número de piloto de tu moto visible. Si falta algún requisito, los puntos no serán válidos.';
const DEFAULT_CHALLENGE_SOCIAL = '#RallyADVEdoMex';

const toRouteLocalDateTime = (timestamp, timezone = 'America/Monterrey') => {
    if (!timestamp) return '';
    // routes.start_timestamp/end_timestamp are PostgreSQL `timestamp` values
    // returned without an offset, but the application stores UTC clock time in
    // them. Parse explicitly as UTC before rendering the event's local time.
    const value = moment.utc(timestamp);
    return value.isValid() ? value.tz(timezone).format('YYYY-MM-DDTHH:mm') : '';
};

const routeLocalDateTimeToUtc = (localDateTime, timezone = 'America/Monterrey') => {
    if (!localDateTime) return null;
    const value = moment.tz(localDateTime, 'YYYY-MM-DDTHH:mm', true, timezone);
    return value.isValid() ? value.toISOString() : null;
};

const RouteBuilder = () => {
    const [routes, setRoutes] = useRecoilState(Routes);
    const currentRoute = useRecoilValue(CurrentRoute);
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const [checkpoints, setCheckpoints] = useState([]);
    const [draggedCpIndex, setDraggedCpIndex] = useState(null);
    const [savingCheckpointIds, setSavingCheckpointIds] = useState([]);
    const [removingCheckpointIds, setRemovingCheckpointIds] = useState([]);

    const [categories, setCategories] = useState([]);
    const [newCheckpoint, setNewCheckpoint] = useState({
        name: '',
        lat: '',
        lng: '',
        description: '',
        points: 0,
        is_challenge: false,
        terrain: 'pavement',
        weakSignal: false,
        picture: '',
        category_id: '', // ✅ Add this line
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
        timezone: "America/Monterrey",
        instructions: "",
        challenge_instructions: DEFAULT_CHALLENGE_INSTRUCTIONS,
        challenge_hashtags_accounts: DEFAULT_CHALLENGE_SOCIAL,
        amount: 0,
        slug: "",
    });
    const [picks, setPicks] = useState([]);
    const [newPick, setNewPick] = useState({
        title: '',
        description: '',
        picture: '',
        checkpoints: [], // array of event_checkpoint_ids
        id: null // Added for editing
    });
    const [loggedUser, setLoggedUser] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerHFile, setBannerHFile] = useState(null);
    const [activeAttributeTab, setActiveAttributeTab] = useState('general');
    const [eventPauses, setEventPauses] = useState([]);
    const [loadingPauses, setLoadingPauses] = useState(false);
    const [savingPause, setSavingPause] = useState(false);
    const [pauseDraft, setPauseDraft] = useState({
        id: null,
        pause_start: '',
        pause_end: '',
        description: '',
    });
    const supabase = getSupabase();

    // Link Generator State
    const [referralCode, setReferralCode] = useState("");
    const [includeCoupon, setIncludeCoupon] = useState(false);
    const [desiredPrice, setDesiredPrice] = useState("");
    const [generatedLinks, setGeneratedLinks] = useState(null);
    const [existingCoupons, setExistingCoupons] = useState([]);
    const [referralStats, setReferralStats] = useState([]);

    const fetchCoupons = useCallback(async () => {
        if (!currentRoute?.id) return;

        const [couponsResult, referralsResult] = await Promise.all([
            supabase
                .from("coupons")
                .select("*")
                .eq("route_id", currentRoute.id)
                .order("created_at", { ascending: false }),
            supabase
                .from("event_profile")
                .select("referrer")
                .eq("route_id", currentRoute.id)
                .not("referrer", "is", null),
        ]);

        if (!couponsResult.error) setExistingCoupons(couponsResult.data || []);
        if (!referralsResult.error) {
            const counts = (referralsResult.data || []).reduce((result, item) => {
                const code = item.referrer?.trim();
                if (code) result[code] = (result[code] || 0) + 1;
                return result;
            }, {});
            setReferralStats(Object.entries(counts)
                .map(([code, registrations]) => ({ code, registrations }))
                .sort((a, b) => b.registrations - a.registrations));
        }
    }, [supabase, currentRoute?.id]);

    const handleDeactivateCoupon = async (coupon) => {
        if (!confirm(`¿Estás seguro de desactivar el cupón "${coupon.code}"?`)) return;

        try {
            const { error } = await supabase
                .from("coupons")
                .update({
                    max_uses: 0,
                    expires_at: new Date(0).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", coupon.id);

            if (error) {
                toast.error("Error al desactivar el cupón: " + error.message);
            } else {
                toast.success(`Cupón "${coupon.code}" desactivado.`);
                await logRouteAction('DEACTIVATE_COUPON', `Deactivated coupon code: ${coupon.code}`);
                fetchCoupons();
            }
        } catch (e) {
            console.error("Error deactivating coupon", e);
            toast.error("Error inesperado al desactivar el cupón.");
        }
    };

    const handleGenerateLinks = async () => {
        if (!referralCode) {
            toast.error("Por favor ingresa un código.");
            return;
        }

        // URL valid characters only (no spaces, no symbols except - and _)
        const cleanCode = referralCode.replace(/[^a-zA-Z0-9-_]/g, "");
        if (cleanCode !== referralCode) {
            toast.warning(`El código fue limpiado: ${cleanCode}`);
            setReferralCode(cleanCode);
        }

        let links = {
            referral: `https://www.northbikers.com/${routeAttributes.slug}?ref=${cleanCode}`
        };

        if (includeCoupon && desiredPrice) {
            const originalPrice = routeAttributes.amount;
            if (originalPrice > 0) {
                const discountAmount = originalPrice - desiredPrice;
                let discountPercent = (discountAmount / originalPrice) * 100;
                discountPercent = Math.round(discountPercent * 100) / 100; // 2 decimals

                const expiresAt = new Date();
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);

                const { error } = await supabase
                    .from("coupons")
                    .insert({
                        code: cleanCode,
                        discount_percentage: discountPercent,
                        route_id: currentRoute.id,
                        max_uses: 1500,
                        current_uses: 0,
                        expires_at: expiresAt.toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    toast.error("Error al crear el cupón: " + error.message);
                    return;
                }
                
                toast.success(`Cupón "${cleanCode}" creado con ${discountPercent}% de descuento.`);
                links.coupon = `https://www.northbikers.com/${routeAttributes.slug}?ref=${cleanCode}&coupon_code=${cleanCode}`;
                fetchCoupons();
            } else {
                toast.error("El precio base de la ruta no está definido.");
                return;
            }
        }

        setGeneratedLinks(links);
    };

    const handleCopyCardCreatorLink = async () => {
        const eventSlug = routeAttributes.slug?.trim();

        if (!eventSlug) {
            toast.error("La ruta seleccionada no tiene un slug configurado.");
            return;
        }

        const cardCreatorLink = `https://www.northbikers.com/card-creator?event=${encodeURIComponent(eventSlug)}`;

        try {
            await navigator.clipboard.writeText(cardCreatorLink);
            toast.success("Link del creador de tarjeta copiado!");
        } catch (error) {
            console.error("Error copying card creator link", error);
            toast.error("No se pudo copiar el link.");
        }
    };

    // Preload route data
    const preloadRouteData = async () => {
        if (!currentRoute?.id) return;

        try {
            const { data, error } = await supabase
                .from("routes")
                .select(
                    "title, venue, dates, description, long_description, en_long_description, " +
                    "venue_link, whatsapp_group_url, venue_iframe, start_timestamp, end_timestamp, timezone, " +
                    "banner, banner_h, instructions, amount, slug, challenge_instructions, challenge_hashtags_accounts"
                )
                .eq("id", currentRoute.id)
                .single();

            if (error) {
                toast.error("Error loading route data:", error);
                return;
            }

            const routeTimezone = data.timezone || "America/Monterrey";

            // Timestamps are stored as instants and displayed in the route's local timezone.
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
                start_timestamp: toRouteLocalDateTime(data.start_timestamp, routeTimezone),
                end_timestamp: toRouteLocalDateTime(data.end_timestamp, routeTimezone),
                timezone: routeTimezone,
                banner: data.banner || "",
                banner_h: data.banner_h || "",
                instructions: data.instructions || "",
                challenge_instructions: data.challenge_instructions || DEFAULT_CHALLENGE_INSTRUCTIONS,
                challenge_hashtags_accounts: data.challenge_hashtags_accounts || DEFAULT_CHALLENGE_SOCIAL,
                amount: data.amount || 0,
                slug: data.slug || "",
            });
            
            fetchCoupons();
        } catch (e) {
            toast.error("Unexpected error loading route data:", e);
        }
    };

    useEffect(() => {
        preloadRouteData();
        const fetchUser = async () => {
            const user = await getLoggedUser();
            setLoggedUser(user);
        };
        fetchUser();
    }, [currentRoute]);

    const logRouteAction = async (actionType, summary) => {
        if (!currentRoute?.id) return;
        try {
            await supabase
                .from('route_logs')
                .insert({
                    route_id: currentRoute.id,
                    user_id: loggedUser?.id,
                    action_type: actionType,
                    summary: summary
                });
        } catch (e) {
            console.error("Error writing route log:", e);
        }
    };

    // Handle field updates
    const handleInputChange = (key, value) => {
        setRouteAttributes((prev) => ({ ...prev, [key]: value }));
    };

    const handleTimezoneChange = (nextTimezone) => {
        setRouteAttributes((prev) => {
            const previousTimezone = prev.timezone || 'America/Monterrey';
            const convertLocalValue = (localValue) => {
                if (!localValue) return '';
                const instant = moment.tz(localValue, 'YYYY-MM-DDTHH:mm', true, previousTimezone);
                return instant.isValid()
                    ? instant.tz(nextTimezone).format('YYYY-MM-DDTHH:mm')
                    : localValue;
            };

            return {
                ...prev,
                timezone: nextTimezone,
                start_timestamp: convertLocalValue(prev.start_timestamp),
                end_timestamp: convertLocalValue(prev.end_timestamp),
            };
        });
    };

    const handleSaveAttribute = async (key, value) => {
        try {
            const databaseValue = ['start_timestamp', 'end_timestamp'].includes(key)
                ? routeLocalDateTimeToUtc(value, routeAttributes.timezone)
                : value;

            if (['start_timestamp', 'end_timestamp'].includes(key) && value && !databaseValue) {
                toast.error('La fecha y hora no son válidas.');
                return;
            }

            // Fetch old attribute value to log difference
            const { data: oldRouteData } = await supabase
                .from("routes")
                .select(key)
                .eq("id", currentRoute.id)
                .single();
            const oldValue = oldRouteData ? oldRouteData[key] : "";

            const { error } = await supabase
                .from("routes")
                .update({ [key]: databaseValue })
                .eq("id", currentRoute.id);

            if (error) {
                toast.error(`Error saving ${key}:`, error);
            } else {
                toast.success(`"${key}" saved successfully!`);
                await logRouteAction('UPDATE_ROUTE_ATTRIBUTE', `Updated route attribute "${key}": set from "${oldValue}" to "${databaseValue}"`);
            }
        } catch (e) {
            toast.error(`Unexpected error saving ${key}:`, e);
        }
    };

    const fetchEventPauses = useCallback(async () => {
        if (!currentRoute?.id) {
            setEventPauses([]);
            return;
        }

        setLoadingPauses(true);
        const { data, error } = await supabase
            .from('event_pauses')
            .select('id, event_id, pause_start, pause_end, description, created_at, updated_at')
            .eq('event_id', currentRoute.id)
            .order('pause_start', { ascending: true });

        if (error) {
            toast.error(`Error al cargar pausas: ${error.message}`);
        } else {
            setEventPauses(data || []);
        }
        setLoadingPauses(false);
    }, [currentRoute?.id, supabase]);

    useEffect(() => {
        fetchEventPauses();
        setPauseDraft({ id: null, pause_start: '', pause_end: '', description: '' });
    }, [fetchEventPauses]);

    const handleEditPause = (pause) => {
        setPauseDraft({
            id: pause.id,
            pause_start: toRouteLocalDateTime(pause.pause_start, routeAttributes.timezone),
            pause_end: toRouteLocalDateTime(pause.pause_end, routeAttributes.timezone),
            description: pause.description || '',
        });
    };

    const handleCancelPauseEdit = () => {
        setPauseDraft({ id: null, pause_start: '', pause_end: '', description: '' });
    };

    const handleSavePause = async () => {
        if (!currentRoute?.id || !pauseDraft.pause_start || !pauseDraft.pause_end) {
            toast.error('Selecciona el inicio y fin de la pausa.');
            return;
        }

        const pauseStart = routeLocalDateTimeToUtc(pauseDraft.pause_start, routeAttributes.timezone);
        const pauseEnd = routeLocalDateTimeToUtc(pauseDraft.pause_end, routeAttributes.timezone);
        if (!pauseStart || !pauseEnd || moment(pauseEnd).isSameOrBefore(moment(pauseStart))) {
            toast.error('El fin de la pausa debe ser posterior al inicio.');
            return;
        }

        setSavingPause(true);
        const payload = {
            event_id: currentRoute.id,
            pause_start: pauseStart,
            pause_end: pauseEnd,
            description: pauseDraft.description.trim() || null,
        };
        const result = pauseDraft.id
            ? await supabase.from('event_pauses').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', pauseDraft.id)
            : await supabase.from('event_pauses').insert(payload);

        if (result.error) {
            toast.error(`Error al guardar la pausa: ${result.error.message}`);
        } else {
            toast.success(pauseDraft.id ? 'Pausa actualizada.' : 'Pausa creada.');
            await logRouteAction(
                pauseDraft.id ? 'UPDATE_EVENT_PAUSE' : 'CREATE_EVENT_PAUSE',
                `${pauseDraft.id ? 'Updated' : 'Created'} event pause from ${pauseStart} to ${pauseEnd}`
            );
            handleCancelPauseEdit();
            await fetchEventPauses();
        }
        setSavingPause(false);
    };

    const handleDeletePause = async (pause) => {
        if (!confirm('¿Eliminar esta pausa del evento?')) return;
        const { error } = await supabase.from('event_pauses').delete().eq('id', pause.id);
        if (error) {
            toast.error(`Error al eliminar la pausa: ${error.message}`);
            return;
        }
        toast.success('Pausa eliminada.');
        await logRouteAction('DELETE_EVENT_PAUSE', `Deleted event pause #${pause.id}`);
        if (pauseDraft.id === pause.id) handleCancelPauseEdit();
        await fetchEventPauses();
    };

    const handleInstructionsUpload = async (file) => {
        if (!file || !currentRoute?.id) return;

        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `instructions/${currentRoute.id}/${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('pictures')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                toast.error(`Error al subir PDF: ${uploadError.message}`);
                return;
            }

            const projectRef = 'aezxnubglexywadbjpgo';
            const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/pictures/${fileName}`;

            const { error: updateError } = await supabase
                .from('routes')
                .update({ instructions: publicUrl })
                .eq('id', currentRoute.id);

            if (updateError) {
                toast.error(`Error al guardar instrucciones: ${updateError.message}`);
                return;
            }

            toast.success(`Archivo PDF subido y guardado exitosamente`);
            await logRouteAction('UPDATE_ROUTE_INSTRUCTIONS', `Uploaded new instructions PDF`);
            setRouteAttributes(prev => ({ ...prev, instructions: publicUrl }));

        } catch (err) {
            toast.error("Error inesperado al subir instrucciones");
            console.error(err);
        }
    };

    const handleBannerUpload = async (file, fieldName) => {
        console.log(file, fieldName);
        if (!file || !currentRoute?.id) return;

        // Use rallies/ subfolder inside pictures bucket
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `rallies/${currentRoute.id}/${Date.now()}.${fileExt}`;

        try {
            // 1. Upload file
            const { error: uploadError } = await supabase.storage
                .from('pictures')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                toast.error(`Error al subir imagen: ${uploadError.message}`);
                return;
            }

            // 2. Build public URL manually (works even if getPublicUrl glitches)
            const projectRef = 'aezxnubglexywadbjpgo'; // ← your Supabase project ref
            const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/pictures/${fileName}`;

            // Quick sanity check
            console.log('Generated public URL:', publicUrl);

            if (!publicUrl) {
                toast.error("No se pudo construir la URL pública");
                return;
            }

            // 3. Save URL to routes table
            const { error: updateError } = await supabase
                .from('routes')
                .update({ [fieldName]: publicUrl })
                .eq('id', currentRoute.id);

            if (updateError) {
                toast.error(`Error al guardar ${fieldName}: ${updateError.message}`);
                return;
            }

            toast.success(`Imagen subida y guardada en ${fieldName}`);
            await logRouteAction('UPDATE_ROUTE_BANNER', `Uploaded new ${fieldName}`);

            // Optional: update local state to show immediately
            setRouteAttributes(prev => ({ ...prev, [fieldName]: publicUrl }));

        } catch (err) {
            toast.error("Error inesperado al subir banner");
            console.error(err);
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

    const getCheckpoints = useCallback(async () => {
        if (currentRoute?.id) {
            try {
                const { data, error } = await supabase
                    .from('event_checkpoints')
                    .select('id, checkpoint_id, order, checkpoints(name, lat, lng, description, points, icon, terrain, weakSignal, picture, category_id, is_challenge)')
                    .eq('event_id', currentRoute.id)
                    .order('order', { ascending: true });

                if (data) {
                    setCheckpoints(data);
                }
            } catch (e) {
                toast.error("Error fetching checkpoints", e);
                setCheckpoints([]);
            }
        }
    }, [currentRoute]);

    const handleCpDragStart = (e, index) => {
        setDraggedCpIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleCpDragOver = (e, index) => {
        e.preventDefault();
    };

    const handleCpDrop = async (e, targetIndex) => {
        e.preventDefault();
        if (draggedCpIndex === null || draggedCpIndex === targetIndex) return;

        const newCheckpoints = [...checkpoints];
        const draggedItem = newCheckpoints[draggedCpIndex];

        // Remove the dragged item and insert it at the target position
        newCheckpoints.splice(draggedCpIndex, 1);
        newCheckpoints.splice(targetIndex, 0, draggedItem);

        // Update local state immediately
        setCheckpoints(newCheckpoints);
        setDraggedCpIndex(null);

        // Save order changes in Supabase event_checkpoints table
        try {
            const updates = newCheckpoints.map((cp, idx) => {
                return supabase
                    .from('event_checkpoints')
                    .update({ order: idx + 1 })
                    .eq('id', cp.id);
            });

            const results = await Promise.all(updates);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) {
                toast.error("Error al guardar el nuevo orden de los checkpoints.");
                console.error(errors);
            } else {
                toast.success("Orden de checkpoints actualizado con éxito.");
                await logRouteAction('REORDER_CHECKPOINTS', `Reordered checkpoints for route ${currentRoute.title}`);
            }
        } catch (error) {
            toast.error("Error al reordenar los checkpoints.");
            console.error(error);
        }
    };


    const fetchPicks = useCallback(async () => {
        if (!currentRoute?.id) return;
        try {
            const { data, error } = await supabase
                .from('picks')
                .select(`
                    id, 
                    title, 
                    description, 
                    picture, 
                    pick_checkpoints (
                        event_checkpoint_id,
                        order
                    )
                `)
                .eq('route_id', currentRoute.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching picks:", error);
            } else {
                setPicks(data || []);
            }
        } catch (e) {
            console.error("Unexpected error fetching picks:", e);
        }
    }, [currentRoute, supabase]);

    useEffect(() => {
        getCheckpoints();
        fetchCategories();
        fetchPicks();
    }, [currentRoute, getCheckpoints, fetchPicks]);

    const handleSaveCheckpoint = async (checkpoint) => {
        const checkpointId = checkpoint.checkpoint_id;
        if (savingCheckpointIds.includes(checkpointId)) return;

        setSavingCheckpointIds((ids) => [...ids, checkpointId]);
        try {
            const updatedCheckpoint = checkpoint.checkpoints;

            // Fetch old checkpoint data to log differences
            const { data: oldCpData } = await supabase
                .from("checkpoints")
                .select("*")
                .eq("id", checkpoint.checkpoint_id)
                .single();

            const { data: savedCheckpoint, error } = await supabase
                .from('checkpoints')
                .update({
                    name: updatedCheckpoint.name,
                    lat: updatedCheckpoint.lat,
                    lng: updatedCheckpoint.lng,
                    description: updatedCheckpoint.description,
                    points: updatedCheckpoint.points,
                    icon: updatedCheckpoint.is_challenge
                        ? "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png"
                        : "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/road.png",
                    terrain: updatedCheckpoint.terrain,
                    weakSignal: updatedCheckpoint.weakSignal,
                    is_challenge: updatedCheckpoint.is_challenge,
                    category_id: updatedCheckpoint.category_id
                        ? Number(updatedCheckpoint.category_id)
                        : null, // ✅ Correct field
                })
                .eq('id', checkpointId)
                .select('id')
                .single();

            if (error || !savedCheckpoint) {
                toast.error(`Error al guardar el checkpoint: ${error?.message || 'no se actualizó ningún registro'}`);
            } else {
                let changes = [];
                if (oldCpData) {
                    if (oldCpData.name !== updatedCheckpoint.name) changes.push(`name from "${oldCpData.name}" to "${updatedCheckpoint.name}"`);
                    if (Number(oldCpData.lat) !== Number(updatedCheckpoint.lat)) changes.push(`lat from ${oldCpData.lat} to ${updatedCheckpoint.lat}`);
                    if (Number(oldCpData.lng) !== Number(updatedCheckpoint.lng)) changes.push(`lng from ${oldCpData.lng} to ${updatedCheckpoint.lng}`);
                    if (oldCpData.description !== updatedCheckpoint.description) changes.push(`description from "${oldCpData.description}" to "${updatedCheckpoint.description}"`);
                    if (Number(oldCpData.points) !== Number(updatedCheckpoint.points)) changes.push(`points from ${oldCpData.points} to ${updatedCheckpoint.points}`);
                    if (oldCpData.is_challenge !== updatedCheckpoint.is_challenge) changes.push(`is_challenge from ${oldCpData.is_challenge} to ${updatedCheckpoint.is_challenge}`);
                    if (oldCpData.terrain !== updatedCheckpoint.terrain) changes.push(`terrain from "${oldCpData.terrain}" to "${updatedCheckpoint.terrain}"`);
                }
                const logSummary = changes.length > 0 
                    ? `Updated checkpoint "${updatedCheckpoint.name}": set ${changes.join(', ')}`
                    : `Updated checkpoint "${updatedCheckpoint.name}" (no changes detected)`;

                // Log the modification
                await supabase
                    .from('checkpoint_logs')
                    .insert({
                        checkpoint_id: checkpoint.checkpoint_id,
                        user_id: loggedUser?.id,
                        summary: logSummary
                    });

                await logRouteAction('UPDATE_CHECKPOINT', logSummary);

                toast.success("Cambios guardados exitosamente.");
                await getCheckpoints();
            }
        } catch (e) {
            console.error("Error updating checkpoint", e);
            toast.error("Error inesperado al actualizar el checkpoint.");
        } finally {
            setSavingCheckpointIds((ids) => ids.filter((id) => id !== checkpointId));
        }
    };

    const handleRemoveCheckpoint = async (checkpoint) => {
        const checkpointName = checkpoint.checkpoints?.name || `#${checkpoint.checkpoint_id}`;
        const eventCheckpointId = checkpoint.id;

        if (removingCheckpointIds.includes(eventCheckpointId)) return;
        if (!window.confirm(`¿Quitar "${checkpointName}" de esta ruta?`)) return;
        if (!window.confirm(`Última confirmación: se eliminarán de esta ruta los avances de participantes y Picks asociados a "${checkpointName}". Esta acción no se puede deshacer. ¿Continuar?`)) return;

        setRemovingCheckpointIds((ids) => [...ids, eventCheckpointId]);
        try {
            const { error: progressError } = await supabase
                .from('profile_event_checkpoints')
                .delete()
                .eq('event_checkpoint_id', eventCheckpointId);
            if (progressError) throw progressError;

            const { error: picksError } = await supabase
                .from('pick_checkpoints')
                .delete()
                .eq('event_checkpoint_id', eventCheckpointId);
            if (picksError) throw picksError;

            const { data: removedCheckpoint, error: removeError } = await supabase
                .from('event_checkpoints')
                .delete()
                .eq('id', eventCheckpointId)
                .eq('event_id', currentRoute.id)
                .select('id')
                .single();
            if (removeError || !removedCheckpoint) {
                throw removeError || new Error('No se eliminó ningún registro de la ruta');
            }

            const logSummary = `Removed checkpoint "${checkpointName}" from route "${currentRoute.title}"`;
            const { error: checkpointLogError } = await supabase
                .from('checkpoint_logs')
                .insert({
                    checkpoint_id: checkpoint.checkpoint_id,
                    user_id: loggedUser?.id,
                    summary: logSummary
                });
            if (checkpointLogError) {
                console.error("Error writing checkpoint removal log:", checkpointLogError);
            }

            await logRouteAction('REMOVE_CHECKPOINT', logSummary);
            toast.success(`"${checkpointName}" fue quitado de la ruta.`);
            await Promise.all([getCheckpoints(), fetchPicks()]);
        } catch (e) {
            console.error("Error removing checkpoint from route", e);
            toast.error(`Error al quitar el checkpoint: ${e.message || 'error inesperado'}`);
            await getCheckpoints();
        } finally {
            setRemovingCheckpointIds((ids) => ids.filter((id) => id !== eventCheckpointId));
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
                    icon: newCheckpoint.is_challenge
                        ? "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png"
                        : "https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/road.png",
                    terrain: newCheckpoint.terrain,
                    weakSignal: newCheckpoint.weakSignal,
                    is_challenge: newCheckpoint.is_challenge,
                    category_id: newCheckpoint.category_id ? Number(newCheckpoint.category_id) : null,
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

            // Log the creation
            await supabase
                .from('checkpoint_logs')
                .insert({
                    checkpoint_id: newCheckpointId,
                    user_id: loggedUser?.id,
                    summary: `Created checkpoint: ${newCheckpoint.name}`
                });

            await logRouteAction('CREATE_CHECKPOINT', `Created checkpoint: ${newCheckpoint.name}`);

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

    const handleSaveNewPick = async () => {
        if (!newPick.title || newPick.checkpoints.length < 2) {
            toast.error("El Pick debe tener un título y al menos 2 checkpoints.");
            return;
        }

        try {
            let pickId = newPick.id;

            // 1. Upsert into picks table
            const pickDataToSave = {
                route_id: currentRoute.id,
                title: newPick.title,
                description: newPick.description,
                picture: newPick.picture,
                profile_id: loggedUser?.id || null
            };

            if (pickId) {
                // Update existing pick
                const { error: updateError } = await supabase
                    .from('picks')
                    .update(pickDataToSave)
                    .eq('id', pickId);

                if (updateError) {
                    toast.error("Error al actualizar el Pick: " + updateError.message);
                    return;
                }

                // Delete existing checkpoints for this pick to refresh them
                await supabase
                    .from('pick_checkpoints')
                    .delete()
                    .eq('pick_id', pickId);
            } else {
                // Insert new pick
                const { data: pickData, error: pickError } = await supabase
                    .from('picks')
                    .insert(pickDataToSave)
                    .select('id')
                    .single();

                if (pickError) {
                    toast.error("Error al crear el Pick: " + pickError.message);
                    return;
                }
                pickId = pickData.id;
            }

            // 2. Insert into pick_checkpoints table
            const pickCheckpoints = newPick.checkpoints.map((event_checkpoint_id, index) => ({
                pick_id: pickId,
                event_checkpoint_id: event_checkpoint_id,
                order: index
            }));

            const { error: junctionError } = await supabase
                .from('pick_checkpoints')
                .insert(pickCheckpoints);

            if (junctionError) {
                toast.error("Error al asociar checkpoints: " + junctionError.message);
                return;
            }

            toast.success(newPick.id ? "Pick actualizado exitosamente." : "Pick creado exitosamente.");
            await logRouteAction(newPick.id ? 'UPDATE_PICK' : 'CREATE_PICK', `${newPick.id ? 'Updated' : 'Created'} pick: ${newPick.title}`);
            setNewPick({ title: '', description: '', picture: '', checkpoints: [], id: null });
            fetchPicks();
        } catch (e) {
            toast.error("Error inesperado al guardar Pick");
            console.error(e);
        }
    };

    const handleEditPick = (pick) => {
        // Extract checkpoint IDs and sort them by 'order'
        const sortedCheckpoints = [...pick.pick_checkpoints]
            .sort((a, b) => a.order - b.order)
            .map(pc => pc.event_checkpoint_id);

        setNewPick({
            id: pick.id,
            title: pick.title,
            description: pick.description,
            picture: pick.picture,
            checkpoints: sortedCheckpoints
        });
        
        // Scroll to form
        window.scrollTo({ top: document.querySelector('.route-builder').offsetTop + 800, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewPick({ title: '', description: '', picture: '', checkpoints: [], id: null });
    };

    const handleDeletePick = async (pickId) => {
        if (!confirm("¿Estás seguro de eliminar este Pick?")) return;

        try {
            const { error } = await supabase
                .from('picks')
                .delete()
                .eq('id', pickId);

            if (error) {
                toast.error("Error al eliminar Pick: " + error.message);
            } else {
                toast.success("Pick eliminado.");
                await logRouteAction('DELETE_PICK', `Deleted pick id: ${pickId}`);
                fetchPicks();
            }
        } catch (e) {
            toast.error("Error inesperado al eliminar Pick");
        }
    };

    const moveSelectedCheckpoint = (index, direction) => {
        const newSelected = [...newPick.checkpoints];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newSelected.length) return;
        
        const temp = newSelected[index];
        newSelected[index] = newSelected[targetIndex];
        newSelected[targetIndex] = temp;
        
        setNewPick(prev => ({ ...prev, checkpoints: newSelected }));
    };

    const handlePickImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `picks/${currentRoute.id}/${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('pictures')
                .upload(fileName, file);

            if (uploadError) {
                toast.error("Error al subir imagen: " + uploadError.message);
                return;
            }

            const projectRef = 'aezxnubglexywadbjpgo';
            const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/pictures/${fileName}`;

            setNewPick(prev => ({ ...prev, picture: publicUrl }));
            toast.success("Imagen de Pick subida.");
        } catch (e) {
            toast.error("Error inesperado al subir imagen");
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
                // Log the image update
                await supabase
                    .from('checkpoint_logs')
                    .insert({
                        checkpoint_id: checkpoint.checkpoint_id,
                        user_id: loggedUser?.id,
                        summary: `Updated image for checkpoint: ${checkpoint.checkpoints?.name || checkpoint.checkpoint_id}`
                    });

                await logRouteAction('UPDATE_CHECKPOINT_IMAGE', `Updated image for checkpoint: ${checkpoint.checkpoints?.name || checkpoint.checkpoint_id}`);

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
                data-background="light"
                data-navbar="light"
                data-left-sidebar="light"
                data-right-sidebar="light"
                className='route-management-page font-sans antialiased text-sm'>
                <div className="flex min-h-screen w-full min-w-0 bg-gray-900 text-gray-100">
                    {/* <Sidebar /> */}
                    <div className="flex-1 min-w-0 p-2 sm:p-4 lg:p-6 overflow-x-hidden bg-gray-800">
                        <div className="min-h-screen w-full p-0 sm:p-2 lg:p-4">
                            <div className="route-builder">
                                {/* <h2 className="text-center mt-6">Constructor de Rutas {currentRoute.title}</h2> */}
                                <div className="route-action-bar text-center mt-3 sm:mt-6 flex flex-wrap items-center justify-center gap-3">
                                    <a
                                        href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=https://www.northbikers.com/${currentRoute.slug}`}
                                        target="_blank"
                                        download={`qr-${currentRoute.slug}.png`}
                                        className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition duration-300 ease-in-out"
                                    >
                                        <span className="route-action-label">Descargar QR para este evento</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={handleCopyCardCreatorLink}
                                        className="inline-block bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-purple-700 hover:shadow-xl transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={!routeAttributes.slug?.trim()}
                                        title={routeAttributes.slug
                                            ? `https://www.northbikers.com/card-creator?event=${encodeURIComponent(routeAttributes.slug)}`
                                            : "Configura el slug del evento para generar el link"}
                                    >
                                        <span className="route-action-label">Copiar link de Card Creator</span>
                                    </button>

                                    {/* Nuevo botón para ver compras */}
                                    <Link
                                        href={`/routes/purchases?routeId=${encodeURIComponent(currentRoute?.id ?? '')}`}
                                        className="inline-block bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-emerald-700 hover:shadow-xl transition duration-300 ease-in-out"
                                    >
                                        <span className="route-action-label">Ver productos comprados</span>
                                    </Link>

                                    {/* Botón para agregar productos a la ruta */}
                                    <Link
                                        href={`/routes/add-product?routeId=${encodeURIComponent(currentRoute?.id ?? '')}`}
                                        className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition duration-300 ease-in-out"
                                    >
                                        <span className="route-action-label">Agregar Producto</span>
                                    </Link>
                                </div>

                                <div className="p-2 sm:p-4 border-t border-gray-700 mt-6 sm:mt-8">
                                    <div className="flex flex-col gap-1 mb-4">
                                        <h2 className="text-2xl font-bold">Administración de la Ruta</h2>
                                        <p className="text-xs text-gray-400">Actualiza atributos, archivos y herramientas comerciales desde un solo lugar.</p>
                                    </div>
                                    <div className="attribute-tabs flex flex-nowrap sm:flex-wrap gap-2 mb-5 p-1.5 rounded-xl bg-gray-900/60 border border-gray-700 overflow-x-auto" role="tablist" aria-label="Administración de la ruta">
                                        {[
                                            { id: 'general', label: 'General' },
                                            { id: 'content', label: 'Contenido' },
                                            { id: 'schedule', label: 'Ubicación y horarios' },
                                            { id: 'assets', label: 'Archivos e imágenes' },
                                            { id: 'marketing', label: 'Referidos y cupones' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={activeAttributeTab === tab.id}
                                                onClick={() => setActiveAttributeTab(tab.id)}
                                                className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                                    activeAttributeTab === tab.id
                                                        ? 'bg-blue-500 text-white shadow'
                                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activeAttributeTab === 'marketing' && (
                                <div className="p-2 sm:p-4">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Generador de Referidos y Cupones</h2>
                                    <div className="bg-gray-700/30 p-3 sm:p-6 rounded-xl border border-gray-600">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block font-bold text-gray-100 mb-2">Código (Referido/Cupón)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: BMWMotorradAngelopolis"
                                                    value={referralCode}
                                                    onChange={(e) => setReferralCode(e.target.value)}
                                                    className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <label className="flex items-center space-x-3 cursor-pointer group mb-2">
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-checkbox h-5 w-5 text-blue-500 rounded border-gray-600 bg-gray-700 focus:ring-0" 
                                                        checked={includeCoupon}
                                                        onChange={() => setIncludeCoupon(!includeCoupon)}
                                                    />
                                                    <span className="font-bold text-gray-100">Generar Cupón de Descuento</span>
                                                </label>
                                            </div>
                                            {includeCoupon && (
                                                <div>
                                                    <label className="block font-bold text-gray-100 mb-2">Precio Final Deseado (Base: ${routeAttributes.amount})</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Ej: 2800"
                                                        value={desiredPrice}
                                                        onChange={(e) => setDesiredPrice(e.target.value)}
                                                        className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-end">
                                                <button 
                                                    onClick={handleGenerateLinks}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded shadow-lg transition-all"
                                                >
                                                    Generar Links y Cupón
                                                </button>
                                            </div>
                                        </div>

                                        {generatedLinks && (
                                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                                                    <span className="text-xs font-bold text-gray-400 block mb-1 uppercase tracking-wider">Link de Referido</span>
                                                    <div className="generated-link-row flex items-center justify-between gap-4">
                                                        <code className="text-sm text-blue-400 break-all">{generatedLinks.referral}</code>
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(generatedLinks.referral);
                                                                toast.success("Link copiado!");
                                                            }}
                                                            className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-600 shrink-0"
                                                        >
                                                            Copiar
                                                        </button>
                                                    </div>
                                                </div>
                                                {generatedLinks.coupon && (
                                                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                                                        <span className="text-xs font-bold text-blue-400 block mb-1 uppercase tracking-wider">Link con Cupón Aplicado</span>
                                                        <div className="generated-link-row flex items-center justify-between gap-4">
                                                            <code className="text-sm text-blue-300 break-all">{generatedLinks.coupon}</code>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(generatedLinks.coupon);
                                                                    toast.success("Link con cupón copiado!");
                                                                }}
                                                                className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-600 shrink-0"
                                                            >
                                                                Copiar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                                            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                                Actividad de Referidos
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {referralStats.reduce((sum, item) => sum + item.registrations, 0)} registros referidos
                                            </span>
                                        </div>
                                        {referralStats.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-gray-600 bg-gray-800/20 p-6 text-center text-sm text-gray-500">
                                                Todavía no hay registros atribuidos a un código de referido para esta ruta.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-gray-600 bg-gray-800/20">
                                                <table className="route-coupons-table w-full min-w-[520px] text-left">
                                                    <thead>
                                                        <tr className="bg-gray-800 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-600">
                                                            <th className="px-6 py-4">Código de referido</th>
                                                            <th className="px-6 py-4 text-center">Registros</th>
                                                            <th className="px-6 py-4 text-right">Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700">
                                                        {referralStats.map((referral) => {
                                                            const referralLink = `https://www.northbikers.com/${routeAttributes.slug}?ref=${referral.code}`;
                                                            return (
                                                                <tr key={referral.code} className="hover:bg-gray-700/30 transition-colors">
                                                                    <td className="px-6 py-4 font-mono text-sm text-purple-300">{referral.code}</td>
                                                                    <td className="px-6 py-4 text-center font-bold text-gray-100">{referral.registrations}</td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(referralLink);
                                                                                toast.success('Link de referido copiado!');
                                                                            }}
                                                                            className="rounded-lg border border-purple-500/30 bg-purple-600/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 hover:bg-purple-600/40"
                                                                        >
                                                                            Copiar link
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {existingCoupons.length > 0 && (
                                        <div className="mt-12">
                                            <h3 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                                Cupones Existentes
                                            </h3>
                                            <div className="overflow-x-auto rounded-xl border border-gray-600 bg-gray-800/20">
                                                <table className="route-coupons-table w-full min-w-[620px] text-left">
                                                    <thead>
                                                        <tr className="bg-gray-800 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-600">
                                                            <th className="px-6 py-4">Código</th>
                                                            <th className="px-6 py-4 text-center">Descuento</th>
                                                            <th className="px-6 py-4">Uso</th>
                                                            <th className="px-6 py-4 text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700">
                                                        {existingCoupons.slice(0, 15).map((coupon) => {
                                                            const couponLink = `https://www.northbikers.com/${routeAttributes.slug}?ref=${coupon.code}&coupon_code=${coupon.code}`;
                                                            const referralLink = `https://www.northbikers.com/${routeAttributes.slug}?ref=${coupon.code}`;
                                                            
                                                            const isDeactivated = coupon.max_uses === 0 || (coupon.expires_at && new Date(coupon.expires_at) < new Date());
                                                            
                                                            return (
                                                                <tr key={coupon.id} className={`hover:bg-gray-700/30 transition-colors ${isDeactivated ? 'opacity-50' : ''}`}>
                                                                    <td className={`px-6 py-4 font-mono text-sm ${isDeactivated ? 'text-gray-500 line-through' : 'text-blue-400'}`}>{coupon.code}</td>
                                                                    <td className="px-6 py-4 text-sm font-bold text-gray-200 text-center">{coupon.discount_percentage}%</td>
                                                                    <td className="px-6 py-4">
                                                                        {isDeactivated ? (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Desactivado</span>
                                                                                <span className="text-[9px] text-gray-500 font-semibold uppercase">{coupon.current_uses} usos</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{coupon.current_uses} / {coupon.max_uses}</span>
                                                                                <div className="w-24 h-1 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                                                                                    <div 
                                                                                        className="h-full bg-blue-500 rounded-full" 
                                                                                        style={{ width: `${Math.min((coupon.current_uses / coupon.max_uses) * 100, 100)}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(referralLink);
                                                                                    toast.success("Link de referido copiado!");
                                                                                }}
                                                                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                                                title="Copiar Link de Referido"
                                                                            >
                                                                                Ref
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(couponLink);
                                                                                    toast.success("Link con cupón copiado!");
                                                                                }}
                                                                                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                                                title="Copiar Link con Cupón"
                                                                            >
                                                                                Cupón
                                                                            </button>
                                                                            {!isDeactivated && (
                                                                                <button 
                                                                                    onClick={() => handleDeactivateCoupon(coupon)}
                                                                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                                                    title="Desactivar Cupón"
                                                                                >
                                                                                    Desactivar
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}

                                <div className="p-2 sm:p-4">
                                    {activeAttributeTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Title */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4 md:col-span-2">
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
                                    </div>
                                    )}

                                    {activeAttributeTab === 'content' && (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {/* Long Description */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold text-gray-100 mb-1">Instrucciones generales de retos</label>
                                        <p className="text-xs text-gray-400 mb-2">Aplican a todos los retos de esta ruta.</p>
                                        <textarea
                                            rows={8}
                                            value={routeAttributes.challenge_instructions}
                                            onChange={(e) => handleInputChange('challenge_instructions', e.target.value)}
                                            className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute('challenge_instructions', routeAttributes.challenge_instructions)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Instrucciones de Retos
                                        </button>
                                    </div>
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold text-gray-100 mb-1">Hashtags y cuentas para retos</label>
                                        <p className="text-xs text-gray-400 mb-2">Indica el hashtag y las cuentas que deben etiquetarse en Facebook e Instagram.</p>
                                        <textarea
                                            rows={8}
                                            value={routeAttributes.challenge_hashtags_accounts}
                                            onChange={(e) => handleInputChange('challenge_hashtags_accounts', e.target.value)}
                                            placeholder="#RallyADVEdoMex\nFacebook: @cuenta1, @cuenta2\nInstagram: @cuenta1, @cuenta2"
                                            className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={() => handleSaveAttribute('challenge_hashtags_accounts', routeAttributes.challenge_hashtags_accounts)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Hashtags y Cuentas
                                        </button>
                                    </div>
                                    </div>
                                    )}

                                    {activeAttributeTab === 'schedule' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Venue Link */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4 md:col-span-2">
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4 md:col-span-2">
                                        <label className="block font-bold mb-1">Zona horaria</label>
                                        <p className="text-xs text-gray-400 mb-2">
                                            Se usa para interpretar los horarios locales de inicio y fin de esta ruta.
                                        </p>
                                        <select
                                            value={routeAttributes.timezone}
                                            onChange={(e) => handleTimezoneChange(e.target.value)}
                                            className="bg-gray-700 text-gray-100 border border-gray-600 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {ROUTE_TIMEZONES.map((timezone) => (
                                                <option key={timezone.value} value={timezone.value}>
                                                    {timezone.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleSaveAttribute("timezone", routeAttributes.timezone)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                                        >
                                            Guardar Zona Horaria
                                        </button>
                                    </div>

                                    {/* Start Timestamp */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold">Inicio</label>
                                        <p className="text-xs text-gray-400 mb-2">
                                            Hora local en {routeAttributes.timezone} ({moment().tz(routeAttributes.timezone).format('z UTCZ')})
                                        </p>
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
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold">Fin</label>
                                        <p className="text-xs text-gray-400 mb-2">
                                            Hora local en {routeAttributes.timezone} ({moment().tz(routeAttributes.timezone).format('z UTCZ')})
                                        </p>
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
                                    )}

                                    {activeAttributeTab === 'assets' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Banner principal (routes.banner) */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold text-gray-100 mb-1">Banner principal (routes.banner)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setBannerFile(file);
                                                    handleBannerUpload(file, "banner");
                                                }
                                            }}
                                            className="bg-gray-700 text-gray-300 border border-gray-600 p-2 rounded w-full"
                                        />
                                        {routeAttributes.banner && (
                                            <div className="mt-3">
                                                <p className="text-sm text-gray-400 mb-1">Vista previa actual:</p>
                                                <img
                                                    src={routeAttributes.banner}
                                                    alt="Banner actual"
                                                    className="max-h-48 object-contain rounded border border-gray-600"
                                                    onError={(e) => {
                                                        if (!e.target.dataset.error) {
                                                            e.target.dataset.error = "true";
                                                            e.target.src = "/logo_nb_white.png";
                                                        }
                                                    }} // fallback
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Banner horizontal / alternativa (routes.banner_h) */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4">
                                        <label className="block font-bold text-gray-100 mb-1">Banner horizontal / secundario (routes.banner_h)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setBannerHFile(file);
                                                    handleBannerUpload(file, "banner_h");
                                                }
                                            }}
                                            className="bg-gray-700 text-gray-300 border border-gray-600 p-2 rounded w-full"
                                        />
                                        {routeAttributes.banner_h && (
                                            <div className="mt-3">
                                                <p className="text-sm text-gray-400 mb-1">Vista previa actual:</p>
                                                <img
                                                    src={routeAttributes.banner_h}
                                                    alt="Banner horizontal actual"
                                                    className="max-h-48 object-contain rounded border border-gray-600"
                                                    onError={(e) => {
                                                        if (!e.target.dataset.error) {
                                                            e.target.dataset.error = "true";
                                                            e.target.src = "/logo_nb_white.png";
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Instrucciones PDF */}
                                    <div className="rounded-xl border border-gray-700 bg-gray-900/30 p-4 lg:col-span-2">
                                        <label className="block font-bold text-gray-100 mb-1">Instrucciones (PDF)</label>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleInstructionsUpload(file);
                                                }
                                            }}
                                            className="bg-gray-700 text-gray-300 border border-gray-600 p-2 rounded w-full"
                                        />
                                        {routeAttributes.instructions && (
                                            <div className="mt-3 bg-gray-900/50 p-3 rounded border border-gray-700 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" className="w-8 h-8" alt="PDF icon" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-200">Rider's Guide / PDF de Instrucciones</p>
                                                        <a 
                                                            href={routeAttributes.instructions} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-xs text-blue-400 hover:underline"
                                                        >
                                                            Ver archivo actual
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    </div>
                                    )}
                                </div>

                                <section className="event-pauses-section mx-2 sm:mx-4 mt-5 sm:mt-8 rounded-xl border border-gray-700 bg-gray-900/35 p-3 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold">Pausas del evento</h2>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Configura periodos en los que la actividad estará pausada. Horario local: {routeAttributes.timezone}.
                                            </p>
                                        </div>
                                        <span className="self-start rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs text-gray-300">
                                            {eventPauses.length} {eventPauses.length === 1 ? 'pausa' : 'pausas'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 rounded-xl border border-gray-700 bg-gray-900 p-3 sm:p-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-300 mb-1">Inicio de pausa</label>
                                            <input
                                                type="datetime-local"
                                                value={pauseDraft.pause_start}
                                                onChange={(e) => setPauseDraft(prev => ({ ...prev, pause_start: e.target.value }))}
                                                className="w-full rounded border border-gray-600 bg-gray-800 p-2 text-gray-100 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-300 mb-1">Fin de pausa</label>
                                            <input
                                                type="datetime-local"
                                                value={pauseDraft.pause_end}
                                                onChange={(e) => setPauseDraft(prev => ({ ...prev, pause_end: e.target.value }))}
                                                className="w-full rounded border border-gray-600 bg-gray-800 p-2 text-gray-100 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="xl:col-span-2">
                                            <label className="block text-xs font-bold text-gray-300 mb-1">Descripción</label>
                                            <input
                                                type="text"
                                                value={pauseDraft.description}
                                                onChange={(e) => setPauseDraft(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Ej. Pausa para descansar y evitar rodar de noche"
                                                className="w-full rounded border border-gray-600 bg-gray-800 p-2 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-2 xl:col-span-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
                                            {pauseDraft.id && (
                                                <button
                                                    type="button"
                                                    onClick={handleCancelPauseEdit}
                                                    className="rounded bg-gray-700 px-4 py-2 font-semibold text-gray-100 hover:bg-gray-600"
                                                >
                                                    Cancelar edición
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSavePause}
                                                disabled={savingPause}
                                                className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {savingPause ? 'Guardando…' : pauseDraft.id ? 'Actualizar pausa' : 'Crear pausa'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {loadingPauses ? (
                                            <p className="py-6 text-center text-sm text-gray-500">Cargando pausas…</p>
                                        ) : eventPauses.length === 0 ? (
                                            <p className="rounded-lg border border-dashed border-gray-700 py-6 text-center text-sm text-gray-500">No hay pausas configuradas para esta ruta.</p>
                                        ) : eventPauses.map((pause) => (
                                            <article key={pause.id} className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                                                <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Inicio</span>
                                                        <strong className="text-sm text-gray-100">
                                                            {moment.utc(pause.pause_start).tz(routeAttributes.timezone).format('DD/MM/YYYY, h:mm a')}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Fin</span>
                                                        <strong className="text-sm text-gray-100">
                                                            {moment.utc(pause.pause_end).tz(routeAttributes.timezone).format('DD/MM/YYYY, h:mm a')}
                                                        </strong>
                                                    </div>
                                                </div>
                                                <p className="flex-1 text-sm text-gray-300">{pause.description || 'Sin descripción'}</p>
                                                <div className="flex gap-2 sm:self-end lg:self-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditPause(pause)}
                                                        className="flex-1 rounded border border-blue-700 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-900/30"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePause(pause)}
                                                        className="flex-1 rounded border border-red-800 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-900/30"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>

                                <div className="container mx-auto mt-4 min-w-0">
                                    <div className="checkpoint-actions text-right mb-4">
                                        <button
                                            onClick={downloadCheckpointsCSV}
                                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-300"
                                        >
                                            Descargar Checkpoints en CSV
                                        </button>
                                    </div>
                                    <div className="route-checkpoints-scroll overflow-x-auto rounded-lg border border-gray-700">
                                        <table className="route-checkpoints-table table-auto min-w-[1500px] w-full text-left">
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
                                                    <th>Acciones</th>
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
                                                            checked={newCheckpoint.is_challenge}
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, is_challenge: e.target.checked })
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
                                                            value={newCheckpoint.category_id || ''}
                                                            className='bg-gray-700'
                                                            onChange={(e) =>
                                                                setNewCheckpoint({ ...newCheckpoint, category_id: e.target.value })
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
                                                    <tr
                                                        key={cp.id}
                                                        draggable={true}
                                                        onDragStart={(e) => handleCpDragStart(e, index)}
                                                        onDragOver={(e) => handleCpDragOver(e, index)}
                                                        onDrop={(e) => handleCpDrop(e, index)}
                                                        className="cursor-move hover:bg-gray-700/50 transition-colors border-b border-gray-700/50"
                                                    >
                                                        <td className="p-2 flex items-center gap-2">
                                                            <span className="text-gray-500">☰</span>
                                                            {cp.checkpoint_id}
                                                        </td>
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
                                                                checked={cp.checkpoints.is_challenge} // Ensuring it's a boolean
                                                                onChange={(e) =>
                                                                    setCheckpoints((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === index ? { ...item, checkpoints: { ...item.checkpoints, is_challenge: e.target.checked } } : item
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
                                                            <button type="button" style={{ backgroundColor: 'black', color: 'white', padding: '8px 16px', borderRadius: '4px' }}
                                                                disabled={savingCheckpointIds.includes(cp.checkpoint_id) || removingCheckpointIds.includes(cp.id)}
                                                                onClick={() => handleSaveCheckpoint(cp)}>
                                                                {savingCheckpointIds.includes(cp.checkpoint_id) ? 'Guardando...' : 'Guardar'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="ml-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white py-2 px-4 rounded"
                                                                disabled={savingCheckpointIds.includes(cp.checkpoint_id) || removingCheckpointIds.includes(cp.id)}
                                                                onClick={() => handleRemoveCheckpoint(cp)}>
                                                                {removingCheckpointIds.includes(cp.id) ? 'Quitando...' : 'Quitar'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-8 sm:mt-12 bg-gray-800 p-3 sm:p-6 rounded-lg border border-gray-700">
                                        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-blue-400">Picks de la Ruta</h2>

                                        {/* Create New Pick Form */}
                                        <div className="mb-8 bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-600">
                                            <h3 className="text-lg font-semibold mb-4">
                                                {newPick.id ? 'Editar Pick' : 'Crear Nuevo Pick'}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                                                        value={newPick.title}
                                                        onChange={(e) => setNewPick(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="Ej: Los Mejores Miradores"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-1">Imagen</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-sm"
                                                        onChange={handlePickImageUpload}
                                                    />
                                                    {newPick.picture && <p className="text-xs text-green-400 mt-1">Imagen lista ✓</p>}
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                                <textarea
                                                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white h-20"
                                                    value={newPick.description}
                                                    onChange={(e) => setNewPick(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Breve descripción del pick..."
                                                />
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Seleccionar Checkpoints (Mínimo 2)</label>
                                                <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-800 p-3 rounded">
                                                    {checkpoints.map(cp => (
                                                        <label key={cp.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-900"
                                                                checked={newPick.checkpoints.includes(cp.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setNewPick(prev => ({ ...prev, checkpoints: [...prev.checkpoints, cp.id] }));
                                                                    } else {
                                                                        setNewPick(prev => ({ ...prev, checkpoints: prev.checkpoints.filter(id => id !== cp.id) }));
                                                                    }
                                                                }}
                                                            />
                                                            <span className="truncate">{cp.checkpoints.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Sortable Selected Checkpoints */}
                                            {newPick.checkpoints.length > 0 && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-400 mb-2">Orden de los Checkpoints (Arrastra no implementado, usa flechas)</label>
                                                    <div className="space-y-2 bg-gray-800 p-3 rounded border border-gray-700">
                                                        {newPick.checkpoints.map((id, index) => {
                                                            const cp = checkpoints.find(c => c.id === id);
                                                            return (
                                                                <div key={id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                                                                    <span className="text-sm text-white truncate flex-1">
                                                                        {index + 1}. {cp?.checkpoints?.name || id}
                                                                    </span>
                                                                    <div className="flex space-x-1">
                                                                        <button 
                                                                            onClick={() => moveSelectedCheckpoint(index, -1)}
                                                                            disabled={index === 0}
                                                                            className="p-1 hover:bg-gray-600 disabled:opacity-30 rounded text-blue-400"
                                                                            title="Subir"
                                                                        >
                                                                            ↑
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => moveSelectedCheckpoint(index, 1)}
                                                                            disabled={index === newPick.checkpoints.length - 1}
                                                                            className="p-1 hover:bg-gray-600 disabled:opacity-30 rounded text-blue-400"
                                                                            title="Bajar"
                                                                        >
                                                                            ↓
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleSaveNewPick}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition duration-200"
                                            >
                                                {newPick.id ? 'Actualizar Pick' : 'Guardar Pick'}
                                            </button>
                                            {newPick.id && (
                                                <button 
                                                    onClick={handleCancelEdit}
                                                    className="ml-4 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded transition duration-200"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>

                                        {/* List of Existing Picks */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold mb-4">Picks Existentes</h3>
                                            {picks.length === 0 ? (
                                                <p className="text-gray-500 italic text-center py-4">No hay picks creados para esta ruta.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {picks.map(pick => (
                                                        <div key={pick.id} className="bg-gray-900 p-4 rounded-lg border border-gray-600 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                            {pick.picture && (
                                                                <img src={pick.picture} alt={pick.title} className="w-24 h-24 object-cover rounded shadow-md" />
                                                            )}
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-lg text-white">{pick.title}</h4>
                                                                <p className="text-gray-400 text-sm mb-1">{pick.description}</p>
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                                                        {pick.pick_checkpoints?.length || 0} Checkpoints
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => handleEditPick(pick)}
                                                                    className="text-blue-400 hover:text-blue-300 text-sm font-medium border border-blue-900 px-3 py-1 rounded hover:bg-blue-900/20 transition"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeletePick(pick.id)}
                                                                    className="text-red-400 hover:text-red-300 text-sm font-medium border border-red-900 px-3 py-1 rounded hover:bg-red-900/20 transition"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
            </div>
            <style jsx global>{`
                .route-management-page,
                .route-management-page * { box-sizing: border-box; }
                .route-management-page { width: 100%; max-width: 100vw; min-width: 0; overflow-x: clip; }
                .route-management-page > .flex,
                .route-management-page .route-builder { width: 100%; max-width: 100%; min-width: 0; }
                .route-management-page input,
                .route-management-page select,
                .route-management-page textarea { max-width: 100%; }
                .route-management-page .ql-toolbar { display: flex; flex-wrap: wrap; }
                .route-management-page .ql-container { min-height: 150px; }
                .route-management-page .route-checkpoints-table th,
                .route-management-page .route-checkpoints-table td { padding: .5rem; vertical-align: middle; }
                .route-management-page .route-checkpoints-table input:not([type='checkbox']):not([type='file']),
                .route-management-page .route-checkpoints-table select { width: 125px; min-width: 100px; padding: .4rem; border-radius: .25rem; }
                .route-management-page .route-checkpoints-table input[type='file'] { width: 190px; }
                .route-management-page .route-checkpoints-table textarea { width: 260px; min-width: 240px; min-height: 96px; padding: .45rem; border-radius: .25rem; background: #374151; color: #f3f4f6; }
                .route-management-page .route-checkpoints-scroll { -webkit-overflow-scrolling: touch; }
                @media (max-width: 640px) {
                    .route-management-page .route-action-bar > a,
                    .route-management-page .route-action-bar > button { width: 100%; min-height: 48px; display: flex; justify-content: center; align-items: center; padding: 10px 14px; white-space: normal; line-height: 1.35; font-size: 13px; color: #fff !important; text-align: center; }
                    .route-management-page .route-action-bar > a { width: 100%; min-height: 48px; display: flex; justify-content: center; align-items: center; padding: 10px 14px; white-space: normal; line-height: 1.35; font-size: 13px; color: #fff !important; text-align: center; }
                    .route-management-page .route-action-label { display: block; width: 100%; color: #fff !important; font-size: 13px; line-height: 1.35; text-align: center; overflow: visible; }
                    .route-management-page .route-action-bar { gap: 8px; padding: 0 2px; }
                    .route-management-page .generated-link-row { align-items: stretch; flex-direction: column; }
                    .route-management-page .generated-link-row button { align-self: flex-end; }
                    .route-management-page .checkpoint-actions button { width: 100%; }
                    .route-management-page .attribute-tabs { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); overflow: visible; }
                    .route-management-page .attribute-tabs [role='tab'] { width: 100%; min-height: 42px; white-space: normal; padding: 8px 6px; line-height: 1.25; }
                    .route-management-page .route-coupons-table th,
                    .route-management-page .route-coupons-table td { padding: .75rem; }
                    .route-management-page input[type='file'] { font-size: 11px; }
                    .route-management-page .ql-editor { min-height: 150px; }
                }
            `}</style>
        </>
    );
};

export default RouteBuilder;
