import SectionTitle from "../../components/section-title";
import Widget from "../../components/widget";
import ParticipantsMap from "./map";
import ParticipantsList from "./list";
import {getSupabase} from "../../utils/supabase";
import {useCallback, useEffect, useState} from "react";
import {useSetRecoilState} from "recoil";
import {ParticipantsMarkers} from "../../store/atoms/global";

const ParticipantsPage = () => {
    const supabase = getSupabase();
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const setMarkers = useSetRecoilState(ParticipantsMarkers);


    const getData = useCallback(async () => {
        setLoading(true)
        try {
            const {data} = await supabase.from("event_profile").select(`
                  *,
                   profile: profile_id (*),
                   route: route_id (*)
                  `)
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
    }, [])

    useEffect(() => {
        getData()
    }, [getData])

    return (
        <div>
            <SectionTitle title="Detalles" subtitle="Participantes" buttonTitle={'Nuevo participante'}/>
            <Widget>
                <div className='flex h-vp-70'>
                    <ParticipantsList isLoading={isLoading} data={data}/>
                    <ParticipantsMap/>
                </div>
            </Widget>
        </div>

    )
}

export default ParticipantsPage
