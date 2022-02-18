import Modal from "../modal";
import {useRecoilValue} from "recoil";
import {useCallback, useEffect, useState} from "react";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";
import Map from "../../map";
import Spinner from "../../spinner";
import CheckInImage from "./check-in-image";
import {AiFillCheckCircle, AiFillCloseCircle} from "react-icons/ai";

const CheckInsModal = ({isOpen, onClose, profile}) => {
    const currentRoute = useRecoilValue(CurrentRoute);
    const supabase = getSupabase();
    const [checkins, setCheckins] = useState(null);
    const [isLoading, setLoading] = useState(false);
    const [markers, setMarkers] = useState([]);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);

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
                .order('id', { ascending: false })

            setCheckins(data)
            data.forEach((d) => {
                if (d.id === selectedCheckIn?.id) {
                    setSelectedCheckIn(d)
                }
            })
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
            setMarkers([])
            setCheckins(setLoading(false))
        }
    }, [isOpen, profile])


    const handleItemClick = (item) => {
        setSelectedCheckIn(item)
        setMarkers([
            {latitude: item.lat, longitude: item.lng, icon: '/check-in.png'},
            {latitude: item.checkpoint.lat, longitude: item.checkpoint.lng, icon: '/pin.png'},
        ])
    }


    const renderContent = () => {

        if (isLoading && !checkins?.length) {
            return (
                <div className="mt-4">
                    <Spinner size={50}/>
                </div>
            )
        }

        if (checkins?.length) {
            return (
                checkins?.map((c, idx) => {
                    return (
                        <div key={c.id} className={`relative p-2 bordered hover:bg-gray-100 cursor-pointer flex items-center ${selectedCheckIn?.id === c.id ? 'bg-gray-100' : ''}`} onClick={() => handleItemClick(c)}>
                            <img src={c.checkpoint.picture} alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>
                            <div className='pr-8'>
                                <b>{c.checkpoint.name}</b>
                                <p>{c.checkpoint.description}</p>
                                <p>{c.points ?? 0} pts.</p>
                            </div>

                            {c?.is_valid ? (
                                <AiFillCheckCircle className={'absolute right-4 text-green-600'} size={20}/>
                            ) : (
                                <AiFillCloseCircle className={'absolute right-4 text-red-600'} size={20}/>
                            )}
                        </div>
                    )
                })
            )
        }

        if (!isLoading && !checkins?.length) {
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
            size='7xl'
            title={isLoading ? 'Cargando checkins' : `Check-ins ${profile?.name ? 'de ' + profile.name : 'del participante'}`}
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
                <div className='w-full overflow-auto'>
                    <Map width='100%' height='50%' markers={markers}/>
                    <CheckInImage checkIn={selectedCheckIn} onSuccess={getCheckpoints}/>
                </div>
            </div>
        </Modal>
    )
}

export default CheckInsModal
