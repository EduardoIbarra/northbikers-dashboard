import Modal from "../modal";
import {useRecoilValue} from "recoil";
import {useCallback, useEffect, useState} from "react";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";
import Map from "../../map";
import Spinner from "../../spinner";
import CheckInImage from "./check-in-image";
import {AiFillCheckCircle, AiFillCloseCircle} from "react-icons/ai";
import moment from "moment";
import 'moment/locale/es-mx'

moment.locale('es-mx')
const CheckInsModal = ({isOpen, onClose, profile}) => {
    const currentRoute = useRecoilValue(CurrentRoute);
    const supabase = getSupabase();
    const [checkins, setCheckins] = useState(null);
    const [isLoading, setLoading] = useState(false);
    const [markers, setMarkers] = useState([]);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);
    const [dataHasChanged, seChangedData] = useState(false);
    console.log({profile, checkins});
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
                .order('id', {ascending: false})

            setCheckins(data)
            const defaultCheckin = data.find((d) => d.id === selectedCheckIn?.id)
            setSelectedCheckIn(defaultCheckin ?? data[0]);
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
            setLoading(false)
            seChangedData(false)
        }
    }, [isOpen, profile])


    const handleItemClick = (item) => {
        setSelectedCheckIn(item)
        setMarkers([
            {latitude: item.checkpoint.lat, longitude: item.checkpoint.lng, icon: '/check-in.png'},
            item.original_lat ? {latitude: item.original_lat, longitude: item.original_lng, icon: '/pin.png'} : [],
            item.original_lat !== item.lat ? {latitude: item.lat, longitude: item.lng, icon: '/pin-black.png'} : [],
        ])
    }

    const handleSuccess = () => {
        seChangedData(true)
        getCheckpoints()
    }


    const renderContent = () => {

        if (isLoading && !checkins?.length) {
            return (
                <div className="">
                    <Spinner size={50}/>
                </div>
            )
        }

        if (checkins?.length) {
            return (
                checkins?.map((c, idx) => {
                    const imgSource = `https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/${c?.checkpoint.picture}`

                    return (
                        <div key={c.id} className={`relative p-2 bordered hover:bg-gray-100 cursor-pointer flex items-center ${selectedCheckIn?.id === c.id ? 'bg-gray-100' : ''}`} onClick={() => handleItemClick(c)}>
                            {c?.checkpoint?.picture && <img src={c?.checkpoint?.picture?.includes('http') ? c?.checkpoint.picture : imgSource} alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>}
                            {!c?.checkpoint?.picture && <img src='/icon.jpg' alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>}
                            <div className='pr-8'>
                                <b>{c.checkpoint.name}</b>
                                <p>{c.checkpoint.description}</p>
                                <p><b>{c.points ?? 0}</b> pts. | A <b>{c.distance.toFixed(2)}km</b> de Distancia</p>
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
                <div className="">
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
            onClose={() => onClose(dataHasChanged)}
            size='w-full'
            title={isLoading ? 'Cargando checkins' : `Check-ins ${profile?.name ? 'de ' + profile.name : 'del participante'}`}
            subtitle={'Selecciona un check-in para verlo en el mapa'}
            okClearButton
            okButton={{
                onClick: () => onClose(dataHasChanged),
                label: 'Cerrar',
            }}
        >
            <div className='flex'>
                <div className='flex m-3 bg-gray-50 p-2 rounded items-center'>
                    <img src="/check-in.png" alt=""/> Checkpoint
                </div>
                <div className='flex m-3 bg-gray-50 p-2 rounded items-center'>
                    <img src="/pin.png" alt=""/> CheckIn Original
                </div>
                <div className='flex m-3 bg-gray-50 p-2 rounded items-center'>
                    <img src="/pin-black.png" alt=""/> Checkin Actualizado
                </div>
            </div>

            <div className='flex h-vp-60'>
                <div className='w-4/12   overflow-auto '>
                    {renderContent()}
                </div>
                <div className='w-full flex flex-col overflow-auto'>
                    {selectedCheckIn && <label className='pl-2 text-lg'>Fechas</label>}
                    {selectedCheckIn && <div className='p-2 mb-2 flex'>
                        <p className='mr-2'>
                            <b>Original</b>: <span className={'capitalize'}>{moment(selectedCheckIn.id).format('dddd DD MMMM,  h:mm:ss A')}</span>
                        </p>
                        |&nbsp;&nbsp;
                        <p className='mr-2'>
                            <b>Creación</b>: <span className={'capitalize'}>{moment(selectedCheckIn.created_at).format('dddd DD MMMM,  h:mm:ss A')}</span>
                        </p>
                        |&nbsp;&nbsp;
                        <p className='mr-2'>
                            <b>Actualización</b>: <span className={'capitalize'}>{moment(selectedCheckIn.updated_at).format('dddd DD MMMM,  h:mm:ss A')}</span>
                        </p>
                    </div>
                    }
                    <div className='flex h-vp-60'>
                        <div className='w-6/12  overflow-auto'>
                            <Map width='100%' markers={markers}/>
                        </div>
                        <div className='w-6/12  overflow-auto'>
                            <CheckInImage checkIn={selectedCheckIn} onSuccess={handleSuccess}/>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default CheckInsModal
