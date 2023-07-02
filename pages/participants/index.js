import SectionTitle from "../../components/section-title";
import Widget from "../../components/widget";
import ParticipantsList from "./list";
import {getSupabase} from "../../utils/supabase";
import {useCallback, useEffect, useState} from "react";
import {useRecoilValue} from "recoil";
import {CurrentRoute} from "../../store/atoms/global";
import AddParticipantModal from "../../components/modals/add-participant";
import Map from "../../components/map";
import TextInput from "../../components/input";
import Select from "../../components/select";
import {CATEGORIES, GENDERS, getLoggedUser} from "../../utils";
import {sort} from 'fast-sort';
import {useRouter} from "next/router";
import Button from "../../components/button";
import JSZip from "jszip";
import {saveAs} from 'file-saver';
import Spinner from "../../components/spinner";

const ParticipantsPage = ({isPrivateView = true}) => {
    const loggedUser = getLoggedUser();
    const router = useRouter()
    const supabase = getSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [fullList, setFullList] = useState([]);
    const [data, setData] = useState([]);
    const currentRoute = useRecoilValue(CurrentRoute);
    const [selectedUser, setSelectedUser] = useState(null);
    const [gender, setGender] = useState('');
    const [category, setCategory] = useState('');
    const [order, setOrder] = useState('points');

    const [isDownloading, setIsDownloading] = useState(false);

    const [totalCount, setTotalCount] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);


    let interval = null


    if (!loggedUser && isPrivateView) {
        router.push('/login')
        return null;
    }

    const handleStopPolling = () => {
        clearInterval(interval)
    }

    const handleSetFilteredResults = (res) => {
        const d = res.filter((r) => {
            if (category && gender) return category?.toLocaleLowerCase() === r.category?.toLocaleLowerCase() && gender?.toLocaleLowerCase() === r.gender?.toLocaleLowerCase()
            if (category && !gender) return category?.toLocaleLowerCase() === r.category?.toLocaleLowerCase()
            if (!category && gender) return gender?.toLocaleLowerCase() === r.gender?.toLocaleLowerCase()
            if (!category && !gender) return true
            return true;
        })
        setData(d)
    }


    const getData = useCallback(async (showLoading) => {
        if (!currentRoute.id) return;
        setLoading(showLoading)

        try {
            const {data: results} = await supabase.from("event_profile").select(`
                  *,
                   profile: profile_id (*),
                   route: route_id (*)
                  `)
                .eq('route_id', currentRoute.id)
            // .match({'gender': gender?.toLocaleLowerCase(), 'category': category})
            // .order('points', {ascending: false})
            console.log({results});

            if (results) {
                setFullList(results.filter(({profile}) => !!profile?.email))
            }
        } catch (e) {
            console.log("Error", e);
            setFullList([])
        }
        setLoading(false)
    }, [currentRoute, category, gender])

    const handlePolling = () => {
        interval = setInterval(() => getData(false), 10000)
    }


    const handleClose = () => {
        setIsOpen(false)
        if (selectedUser) getData()
        setSelectedUser(null)
    }


    const getFilteredData = () => {
        // data = data.filter(p => p.participant_number);
        if (!searchQuery) return data;
        const loweredQuery = searchQuery.toLocaleLowerCase();
        return data.filter(({participant_number, points, profile: {name, email}}) => {
            return (
                participant_number?.toString()?.includes(loweredQuery) ||
                points?.toString()?.includes(loweredQuery) ||
                name?.toLocaleLowerCase()?.includes(loweredQuery) ||
                email?.toLocaleLowerCase()?.includes(loweredQuery)
            )
        })
    }

    const getMarkers = () => {
        if (!searchQuery) return data.map((i, idx) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position}));
        const newData = getFilteredData();
        return newData.map((i) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position}));
    }

    const handleEdit = (u) => {
        setSelectedUser(u)
    }


    useEffect(() => {
        handlePolling()
        return () => {
            handleStopPolling();
        }
    }, [currentRoute])

    useEffect(() => {
        // TODO: Remove this restriction
        fullList = fullList.filter(p => p.participant_number);
        const orderedByPoints = sort(fullList).desc((u) => u.points).map((l, idx) => {
            return {
                ...l,
                position: idx + 1
            }
        })
        const newSorted = sort(orderedByPoints);
        handleSetFilteredResults(order === 'points' ? newSorted.desc(u => u.points) : newSorted.asc(u => u.profile.name))
    }, [category, gender, fullList, order])

    useEffect(() => {
        getData(true)
    }, [getData, isOpen, currentRoute])

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            const {data: feed} = await supabase.from('feeds').select().eq('route_id', 106);
            const zip = new JSZip();
            console.log(`Total images ${feed.length}`,)
            setTotalCount(feed.length)
            setCurrentCount(1)
            let interval = null;

            for (let i = 0; i < feed.length; i++) {
                const item = feed[i];
                const {data} = await supabase
                    .storage
                    .from('pictures')
                    .download(item.photo_url)
                console.log(`item ${i + 1} of ${feed.length}`, data);
                zip.file(item.photo_url, data, {base64: false});

                interval = setInterval(() => {
                    setCurrentCount(i+1)
                }, 5000)
            }

            clearInterval(interval)
            const content = await zip.generateAsync({type: "blob"})
            saveAs(content, "rally_images.zip");

        } catch (e) {
            console.log("Error", e);
            setIsDownloading(false)
        }

        setIsDownloading(false)
    }

    return (
        <div>
            {
                // <Button onClick={handleDownload} disabled={isDownloading}>
                //     {isDownloading ? <div className='flex gap-2'><Spinner size={13}/> Generando {currentCount} de {totalCount}...</div> : 'Descargar imagenes rally'}
                // </Button>
            }

            {isPrivateView ? (
                <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={() => {
                    getData(false);
                    setIsOpen(true)
                }}/>
            ) : (
                <SectionTitle title="Detalles" subtitle="Participantes"/>
            )}

            <div className='w-full mb-2 flex flex-row space-around gap-2 items-end'>
                <div className='w-4/12'>
                    <TextInput label={'Buscar...'} type='text' placeholder='Busca participantes' value={searchQuery} onChange={setSearchQuery}/>
                </div>
                <div className='w-4/12'>
                    <Select placeholder='Filtrar por categoria' showEmpty items={[...[{id: null, title: 'Todos'}], ...CATEGORIES]} onChange={(e) => setCategory(e?.id ?? '')}/>
                </div>
                <div className='w-4/12'>
                    <Select placeholder='Filtrar por género' showEmpty items={[...[{id: null, title: 'Todos'}], ...GENDERS]} onChange={(e) => setGender(e?.id ?? '')}/>
                </div>
            </div>
            <div className='w-full mb-2 flex flex-row space-around gap-2 items-center'>
                <div className='w-4/12'>
                    <Select label={'Ordenar por:'} placeholder='Selecciona' items={[{id: 'points', title: 'Puntos'}, {id: 'name', title: 'Nombre'}]} onChange={(e) => setOrder(e?.id)}/>
                </div>
            </div>
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} data={getFilteredData()} onReload={getData} isFiltered={!!searchQuery || !!category || !!gender} onEdit={handleEdit} isPrivateView={isPrivateView}/>
                    {/* <Map markers={getMarkers()}/> */}
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen || !!selectedUser} onClose={handleClose} allList={fullList} user={selectedUser}/>
        </div>

    )
}

export default ParticipantsPage
