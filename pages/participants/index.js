import SectionTitle from "../../components/section-title";
import Widget from "../../components/widget";
import ParticipantsList from "./list";
import { getSupabase } from "../../utils/supabase";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRecoilValue } from "recoil";
import { CurrentRoute } from "../../store/atoms/global";
import AddParticipantModal from "../../components/modals/add-participant";
import TextInput from "../../components/input";
import Select from "../../components/select";
import { CATEGORIES, getLoggedUser } from "../../utils";
import { sort } from 'fast-sort';
import { useRouter } from "next/router";
import Button from "../../components/button";
import JSZip from "jszip";
import { saveAs } from 'file-saver';
import Spinner from "../../components/spinner";

const ParticipantsPage = ({ isPrivateView = true }) => {
    const loggedUser = getLoggedUser();
    const router = useRouter();
    const supabase = getSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [fullList, setFullList] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [data, setData] = useState([]);
    const currentRoute = useRecoilValue(CurrentRoute);
    const [selectedUser, setSelectedUser] = useState(null);
    const [category, setCategory] = useState('');
    const [order, setOrder] = useState('points');
    const [isDownloading, setIsDownloading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);
    const [isPollingEnabled, setIsPollingEnabled] = useState(false);
    const intervalRef = useRef(null);

    if (!loggedUser && isPrivateView) {
        router.push('/login');
        return null;
    }

    const getData = useCallback(async (showLoading) => {
        if (!currentRoute.id) return;
        setLoading(showLoading);

        try {
            // Fetch event profiles
            const { data: eventProfiles, error: eventProfileError } = await supabase
                .from("event_profile")
                .select(`
                    *,
                    profile: profile_id (*),
                    route: route_id (*)
                `)
                .eq('route_id', currentRoute.id)
                .gt('participant_number', 0);

            if (eventProfileError) throw eventProfileError;

            // Fetch check-ins and join with checkpoints to get the icon field
            const { data: checkIns, error: checkInsError } = await supabase
                .from("check_ins")
                .select(`
                    *,
                    checkpoints:checkpoint_id (icon)
                `)
                .eq('route_id', currentRoute.id)
                .in('profile_id', eventProfiles.map(profile => profile.profile_id));

            if (checkInsError) throw checkInsError;

            // URL of the challenge icon
            const challengeIconUrl = 'https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/icons/challenges.png';

            // Merge the check-ins data with event profiles and count regular and challenge check-ins
            const mergedResults = eventProfiles.map(profile => {
                const relatedCheckIns = checkIns.filter(
                    checkIn => checkIn.profile_id === profile.profile_id && checkIn.route_id === profile.route_id
                );

                // Count challenge and regular check-ins
                const challengeCheckinsCount = relatedCheckIns.filter(
                    checkIn => checkIn.checkpoints.icon === challengeIconUrl
                ).length;

                const regularCheckinsCount = relatedCheckIns.length - challengeCheckinsCount;

                return {
                    ...profile,
                    check_ins: relatedCheckIns,
                    challenge_checkins_number: challengeCheckinsCount,
                    regular_checkins_number: regularCheckinsCount
                };
            });

            // Even if no check-ins exist, the event_profiles will be kept
            mergedResults.forEach(profile => {
                if (!profile.check_ins.length) {
                    profile.challenge_checkins_number = 0;
                    profile.regular_checkins_number = 0;
                }
            });

            // Set the full list of participants once the data is ready
            setFullList(mergedResults.filter(({ profile }) => !!profile?.email));
            setLoading(false);
        } catch (e) {
            console.log("Error fetching data", e);
            setFullList([]);
            setLoading(false);
        }
    }, [currentRoute]);

    useEffect(() => {
        // Apply the filter whenever the category, search query, or full list changes
        const filtered = fullList.filter((item) => {
            const categoryMatch = category === 'all' || !category
                ? true
                : category === 'female'
                    ? item.gender?.toLocaleLowerCase() === 'female'
                    : category === 'couple'
                        ? item.is_couple === true
                        : category === 'team'
                            ? item.is_team === true
                            : item.category?.toLocaleLowerCase() === category.toLocaleLowerCase();

            const searchMatch = searchQuery ? item.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;

            return categoryMatch && searchMatch;
        });

        setFilteredData(filtered);
    }, [category, searchQuery, fullList]);

    const handleClose = () => {
        setIsOpen(false);
        if (selectedUser) getData();
        setSelectedUser(null);
    };

    const getMarkers = () => {
        if (!searchQuery) return data.map((i, idx) => ({ latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position }));
        const newData = filteredData;
        return newData.map((i) => ({ latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position }));
    };

    const handleEdit = (u) => {
        setSelectedUser(u);
    };

    const handlePolling = useCallback(() => {
        if (isPollingEnabled) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => getData(false), 10000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [getData, isPollingEnabled]);

    useEffect(() => {
        handlePolling();

        return () => clearInterval(intervalRef.current);
    }, [handlePolling]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(intervalRef.current);
            } else {
                handlePolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalRef.current);
        };
    }, [handlePolling]);

    const togglePolling = () => setIsPollingEnabled(!isPollingEnabled);

    useEffect(() => {
        getData(true);
    }, [getData, isOpen, currentRoute]);

    useEffect(() => {
        let orderedData = [...filteredData]; // Create a copy of the data array to avoid mutating state directly

        switch (order) {
            case 'points':
                orderedData = sort(orderedData).desc(u => u.points);
                break;
            case 'name':
                orderedData = sort(orderedData).asc(u => u.profile.name);
                break;
            case 'participant_number':
                orderedData = sort(orderedData).asc(u => parseInt(u.participant_number));
                break;
            default:
                break;
        }

        setData(orderedData.map((l, idx) => ({ ...l, position: idx + 1 })));
    }, [order, filteredData]);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const { data: feed } = await supabase.from('feeds').select().eq('route_id', 106);
            const zip = new JSZip();
            setTotalCount(feed.length);
            setCurrentCount(1);
            let interval = null;

            for (let i = 0; i < feed.length; i++) {
                const item = feed[i];
                const { data } = await supabase
                    .storage
                    .from('pictures')
                    .download(item.photo_url);
                zip.file(item.photo_url, data, { base64: false });
                setCurrentCount(i + 1);
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "rally_images.zip");

        } catch (e) {
            setIsDownloading(false);
        }

        setIsDownloading(false);
    };

    return (
        <div>

            {isPrivateView && (loggedUser?.id === 'bd72426c-f32c-41bb-a874-d118474a3f58' || loggedUser?.id === 'dafe8d23-6b92-4d3e-8851-95bd7fb998a2') && (
                <div className="flex flex-row items-center justify-between mb-8 pt-4">
                    <div className="flex flex-col">
                        <div className="text-xs uppercase font-bold tracking-widest text-yellow-500 mb-2">
                            DETALLES DE EVENTO
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter">
                            Participantes
                        </h1>
                    </div>
                    <Button
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500 hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                            getData(false);
                            setIsOpen(true);
                        }}
                    >
                        + Nuevo participante
                    </Button>
                </div>
            )}

            <div className="premium-card p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-4">
                        <TextInput
                            label={'Búsqueda Rápida'}
                            type='text'
                            placeholder='Nombre del participante...'
                            value={searchQuery}
                            onChange={setSearchQuery}
                            className="search-input-premium w-full"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Select
                            label="Categoría"
                            className='bg-neutral-800 border-neutral-800 text-neutral-200 rounded-2xl'
                            placeholder='Todas las categorías'
                            showEmpty
                            items={CATEGORIES}
                            onChange={(e) => setCategory(e?.id ?? '')}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Select
                            label="Ordenar Por"
                            className='bg-neutral-800 border-neutral-800 text-neutral-200 rounded-2xl'
                            placeholder='Seleccionar'
                            items={[
                                { id: 'points', title: 'Puntos' },
                                { id: 'name', title: 'Nombre' },
                                { id: 'participant_number', title: 'Número' }
                            ]}
                            onChange={(e) => setOrder(e?.id)}
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-center bg-neutral-800 rounded-2xl p-4 border border-neutral-800">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-yellow-500 rounded-lg border-neutral-700 bg-neutral-900 focus:ring-0 focus:ring-offset-0 transition-all"
                                checked={isPollingEnabled}
                                onChange={togglePolling}
                            />
                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-white transition-colors">
                                Real-time
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="premium-card overflow-hidden">
                <div className='flex flex-col bg-transparent'>
                    <ParticipantsList
                        isLoading={isLoading}
                        initialData={data}
                        onReload={getData}
                        isFiltered={!!searchQuery || !!category}
                        onEdit={handleEdit}
                        isPrivateView={isPrivateView}
                    />
                </div>
            </div>
            <AddParticipantModal isOpen={isOpen || !!selectedUser} onClose={handleClose} allList={fullList} user={selectedUser} />
        </div>
    );
};

export default ParticipantsPage;
