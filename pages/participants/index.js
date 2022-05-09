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

const ParticipantsPage = () => {
    const supabase = getSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState([]);
    const currentRoute = useRecoilValue(CurrentRoute);

    let interval = null

    const handleStopPolling = () => {
        clearInterval(interval)
    }

    const getData = useCallback(async (showLoading) => {
        if (!currentRoute.id) return;
        setLoading(showLoading)

        try {
            const {data} = await supabase.from("event_profile").select(`
                  *,
                   profile: profile_id (*),
                   route: route_id (*)
                  `)
                .eq('route_id', currentRoute.id)
                .order('points', {ascending: false})
            console.log({data});

            if (data) {
                setData(data.map((d, idx)=>({...d, position: idx+1})))
            }
        } catch (e) {
            console.log("Error", e);
            setData(null)
        }
        setLoading(false)
    }, [currentRoute])

    const handlePolling = () => {
        interval = setInterval(() => getData(false), 10000)
    }


    const handleToggleModal = () => {
        if(!isOpen) getData(false); //fetch current data when about to show modal to get latest
        setIsOpen(!isOpen)
    }

    useEffect(() => {
        handlePolling()

        return () => {
            handleStopPolling();
        }
    }, [currentRoute])


    const getCleanList = () => {
        return data.filter(({profile})=> !!profile?.email )
    }


    const getFilteredData = () => {
        if (!searchQuery) return getCleanList();
        const loweredQuery =searchQuery.toLocaleLowerCase();
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
        if (!searchQuery) return data.map((i, idx) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: idx+1}));
        const newData = getFilteredData();
        return newData.map((i) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id, text: i.position}));
    }


    useEffect(() => {
        getData(true)
    }, [getData, isOpen, currentRoute])

    return (
        <div>
            <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={handleToggleModal}/>
            <div className='w-5/12'>
                <TextInput label={'Buscar...'} type='text' placeholder='Busca participantes' value={searchQuery} onChange={setSearchQuery}/>
            </div>
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} data={getFilteredData()} onReload={getData} isFiltered={!!searchQuery}/>
                    <Map markers={getMarkers()}/>
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen} onClose={handleToggleModal} allList={getCleanList()}/>
        </div>

    )
}

export default ParticipantsPage
