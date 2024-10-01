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

                interval = setInterval(() => {
                    setCurrentCount(i + 1);
                }, 5000);
            }

            clearInterval(interval);
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
                <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={() => {
                    getData(false);
                    setIsOpen(true);
                }} />
            )}

            <div className='w-full mb-2 flex flex-row space-around gap-2 items-end'>
                <div className='w-4/12'>
                    <TextInput label={'Buscar...'} type='text' placeholder='Busca participantes' value={searchQuery} onChange={setSearchQuery} />
                </div>
                <Select
                    placeholder='Filtrar por categoria'
                    showEmpty
                    items={CATEGORIES}
                    onChange={(e) => setCategory(e?.id ?? '')}
                />
            </div>
            <div className='w-full mb-2 flex flex-row space-around gap-2 items-center'>
                <div className='w-4/12'>
                    <Select
                        label={'Ordenar por:'}
                        placeholder='Selecciona'
                        items={[
                            { id: 'points', title: 'Puntos' },
                            { id: 'name', title: 'Nombre' },
                            { id: 'participant_number', title: 'Número de participante' }
                        ]}
                        onChange={(e) => setOrder(e?.id)}
                    />
                </div>

                <label>
                    <input
                        type="checkbox"
                        checked={isPollingEnabled}
                        onChange={togglePolling}
                    />
                    Ver en Tiempo Real
                </label>
            </div>
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} initialData={data} onReload={getData} isFiltered={!!searchQuery || !!category} onEdit={handleEdit} isPrivateView={isPrivateView} />
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen || !!selectedUser} onClose={handleClose} allList={fullList} user={selectedUser} />
        </div>
    );
};

export default ParticipantsPage;
