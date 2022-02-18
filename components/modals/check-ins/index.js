import Modal from "../modal";
import {useRecoilValue} from "recoil";
import {useCallback, useEffect, useState} from "react";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";
import ParticipantsList from "../../../pages/participants/list";
import Map from "../../map";
import Spinner from "../../spinner";

const CheckInsModal = ({isOpen, onClose, profile}) => {
    const currentRoute = useRecoilValue(CurrentRoute);
    const supabase = getSupabase();
    const [checkins, setCheckins] = useState(null);
    const [isLoading, setLoading] = useState(false);
    const [markers, setMarkers] = useState([]);

    const getCheckpoints = useCallback(async () => {
        setLoading(true)
        try {
            const {data} = await supabase.from('check_ins')
                .select(`
                    *,
                    checkpoint: checkpoint_id ( * ),
                    profile: profile_id ( * ) 
                `)
                .eq('route_id', currentRoute.id)
                .eq('profile_id', profile?.id)

            setCheckins(data)
            console.log(data);
        } catch (e) {
            console.log("Error", e);
            setCheckins([])
        }
        setLoading(false)
    }, [currentRoute, profile])


    useEffect(() => {
        if (isOpen && profile?.id) getCheckpoints()

        if (!isOpen) {
            setCheckins(null)
            setCheckins(setLoading(false))
        }
    }, [isOpen, profile])


    const handleItemClick = (item) => {
        setMarkers([
            {latitude: item.lat,longitude: item.lng},
            {latitude: item.checkpoint.lat,longitude: item.checkpoint.lng},
        ])
    }


    const renderContent = () => {

        if(isLoading){
            return (
                <div className="mt-4">
                    <Spinner size={50}/>
                </div>
            )
        }

        if(!isLoading && checkins?.length ){
            return (
                checkins?.map((c) => {
                    return (
                        <div key={c.id} className='p-2 bordered hover:bg-gray-100 cursor-pointer flex items-center' onClick={()=> handleItemClick(c)}>
                            <img src={c.checkpoint.picture} alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>
                            <div>
                                <b>{c.checkpoint.name}</b>
                                <p>{c.checkpoint.description}</p>
                                <p>{c.points ?? 0} pts.</p>
                            </div>
                        </div>
                    )
                })
            )
        }

        if(!isLoading && !checkins?.length ){
            return (
                <div className="mt-4">
                    <div className="mt-10 p-10 text-center">
                        <h6>No se encontraron checkins</h6>
                    </div>
                </div>
            )
        }

        return null
    }


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size='4xl'
            title={isLoading ? 'Cargando checkins' : `Check-ins ${profile?.name ?  'de ' + profile.name: 'del participante'}` }
            subtitle={'Selecciona un check-in para verlo en el mapa'}
            okClearButton
            okButton={{
                onClick: onClose,
                label: 'Cerrar',
            }}
        >
            <div className='flex h-vp-70'>
                <div className='w-3/5   overflow-auto'>
                    {renderContent()}
                </div>
                <div className='w-full'>
                    <Map width='100%' markers={markers}/>
                </div>
            </div>
        </Modal>
    )
}

export default CheckInsModal
