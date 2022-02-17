import SectionTitle from "../../components/section-title";
import Widget from "../../components/widget";
import ParticipantsMap from "./map";
import ParticipantsList from "./list";
import {getSupabase} from "../../utils/supabase";
import {useCallback, useEffect, useState} from "react";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {CurrentRoute, ParticipantsMarkers} from "../../store/atoms/global";
import AddParticipantModal from "../../components/modals/add-participant";

const ParticipantsPage = () => {
    const supabase = getSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const setMarkers = useSetRecoilState(ParticipantsMarkers);
    const currentRoute = useRecoilValue(CurrentRoute);

    const getData = useCallback(async () => {
        if (!currentRoute.id) return;
        setLoading(true)
        try {
            const {data} = await supabase.from("event_profile").select(`
                  *,
                   profile: profile_id (*),
                   route: route_id (*)
                  `)
                .eq('route_id', currentRoute.id)
            console.log({data});

            if (data) {
                setData(data)
                setMarkers(data.map((i) => ({latitude: i.current_lat, longitude: i.current_lng, id: i.id})))
            }
        } catch (e) {
            console.log("Error", e);
            setData(null)
        }
        setLoading(false)
    }, [currentRoute])

    const handleToggleModal = () => {
        setIsOpen(!isOpen)
    }

    useEffect(() => {
        getData()
    }, [getData, isOpen, currentRoute])

    return (
        <div>
            <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'} onClick={handleToggleModal}/>
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} data={data}/>
                    <ParticipantsMap/>
                </div>
            </Widget>
            <AddParticipantModal isOpen={isOpen} onClose={handleToggleModal}/>
        </div>

    )
}

export default ParticipantsPage
