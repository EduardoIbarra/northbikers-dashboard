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
import {CATEGORIES, GENDERS} from "../../utils";

const ParticipantsPage = () => {
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

    let interval = null

    const handleStopPolling = () => {
        clearInterval(interval)
    }

    const handleSetFilteredResults = (res) => {
        console.log({category, gender})
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
                setFullList(results)
            }
        } catch (e) {
            console.log("Error", e);
            setFullList(null)
        }
        setLoading(false)
    }, [currentRoute,category, gender])

    const handlePolling = () => {
        interval = setInterval(() => getData(false), 10000)
    }


    const handleClose = () => {
        setIsOpen(false)
        if (selectedUser) getData()
        setSelectedUser(null)
    }

    useEffect(() => {
        handlePolling()

        return () => {
            handleStopPolling();
        }
    }, [currentRoute])

    useEffect(() => {
        handleSetFilteredResults(fullList)
    }, [category, gender, fullList])


    const getCleanList = () => {
        return data.filter(({profile}) => !!profile?.email)
    }


    const getFilteredData = () => {
        if (!searchQuery) return getCleanList();
        const loweredQuery = searchQuery.toLocaleLowerCase();
        return getCleanList().filter(({participant_number, points, profile: {name, email}}) => {
            return (
                participant_number?.toString()?.includes(loweredQuery) ||
                points?.toString()?.includes(loweredQuery) ||
                name?.toLocaleLowerCase()?.includes(loweredQuery) ||
                email?.toLocaleLowerCase()?.includes(loweredQuery)
            )
        })
    }


    const getMarkers = () => {
        if (!searchQuery) return data.map((i, idx) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: idx + 1}));
        const newData = getFilteredData();
        return newData.map((i) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position}));
    }

    const handleEdit = (u) => {
        setSelectedUser(u)
    }

    useEffect(() => {
        getData(true)
    }, [getData, isOpen, currentRoute])

    return (
        <div>
            <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={() => {
                getData(false);
                setIsOpen(true)
            }}/>
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
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} data={getFilteredData()} onReload={getData} isFiltered={!!searchQuery || !!category || !!gender} onEdit={handleEdit}/>
                    <Map markers={getMarkers()}/>
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen || !!selectedUser} onClose={handleClose} allList={getCleanList()} user={selectedUser}/>
        </div>

    )
}

export default ParticipantsPage
