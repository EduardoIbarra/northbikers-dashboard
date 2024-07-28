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
import { CATEGORIES, GENDERS, getLoggedUser } from "../../utils";
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
    const [gender, setGender] = useState('');
    const [category, setCategory] = useState('');
    const [order, setOrder] = useState('points');
    const [isCouple, setIsCouple] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);

    let interval = null;

    if (!loggedUser && isPrivateView) {
        router.push('/login');
        return null;
    }

    const handleStopPolling = () => {
        clearInterval(interval);
    };

    const handleSetFilteredResults = (res) => {
        const d = res.filter((r) => {
            const categoryMatch = category ? r.category?.toLocaleLowerCase() === category?.toLocaleLowerCase() : true;
            const genderMatch = gender ? r.gender?.toLocaleLowerCase() === gender?.toLocaleLowerCase() : true;
            const coupleMatch = isCouple ? r.is_couple === true : true;
            return categoryMatch && genderMatch && coupleMatch;
        });
        setFilteredData(d);
    };

    const getData = useCallback(async (showLoading) => {
        if (!currentRoute.id) return;
        setLoading(showLoading);

        try {
            const { data: results } = await supabase.from("event_profile").select(`
                  *,
                   profile: profile_id (*),
                   route: route_id (*)
                  `)
                .eq('route_id', currentRoute.id)
                .gt('participant_number', 0);
            console.log({ results });

            if (results) {
                setFullList(results.filter(({ profile }) => !!profile?.email));
                handleSetFilteredResults(results);
            }
        } catch (e) {
            console.log("Error", e);
            setFullList([]);
        }
        setLoading(false);
    }, [currentRoute, category, gender, isCouple]);

    const handleClose = () => {
        setIsOpen(false);
        if (selectedUser) getData();
        setSelectedUser(null);
    };

    const getFilteredData = () => {
        return filteredData.filter((item) => {
            const categoryMatch = category ? item.category?.toLocaleLowerCase() === category?.toLocaleLowerCase() : true;
            const genderMatch = gender ? item.gender?.toLocaleLowerCase() === gender?.toLocaleLowerCase() : true;
            const coupleMatch = isCouple ? item.is_couple === true : true;
            return categoryMatch && genderMatch && coupleMatch;
        });
    };

    const getMarkers = () => {
        if (!searchQuery) return data.map((i, idx) => ({ latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position }));
        const newData = getFilteredData();
        return newData.map((i) => ({ latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position }));
    };

    const handleEdit = (u) => {
        setSelectedUser(u);
    };

    const [isPollingEnabled, setIsPollingEnabled] = useState(false);
    const intervalRef = useRef(null);

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
            {isPrivateView ? (
                <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={() => {
                    getData(false);
                    setIsOpen(true);
                }} />
            ) : (
                <SectionTitle title="Detalles" subtitle="Participantes" />
            )}

            <div className='w-full mb-2 flex flex-row space-around gap-2 items-end'>
                <div className='w-4/12'>
                    <TextInput label={'Buscar...'} type='text' placeholder='Busca participantes' value={searchQuery} onChange={setSearchQuery} />
                </div>
                <Select
                    placeholder='Filtrar por categoria'
                    showEmpty
                    items={[{ id: null, title: 'Todos' }, ...CATEGORIES]}
                    onChange={(e) => setCategory(e?.id ?? '')}
                />
                <Select
                    placeholder='Filtrar por género'
                    showEmpty
                    items={[{ id: null, title: 'Todos' }, ...GENDERS]}
                    onChange={(e) => setGender(e?.id ?? '')}
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
                        checked={isCouple}
                        onChange={() => setIsCouple(!isCouple)}
                    />
                    Mostrar solo parejas
                </label>

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
                    <ParticipantsList isLoading={isLoading} data={data} onReload={getData} isFiltered={!!searchQuery || !!category || !!gender || isCouple} onEdit={handleEdit} isPrivateView={isPrivateView} />
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen || !!selectedUser} onClose={handleClose} allList={fullList} user={selectedUser} />
        </div>
    );
};

export default ParticipantsPage;
