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
                        <div key={c.id} className={`relative p-4 rounded-2xl border border-transparent hover:border-neutral-700 transition-all cursor-pointer flex items-center mb-2 ${selectedCheckIn?.id === c.id ? 'bg-neutral-800 border-neutral-700' : 'hover:bg-neutral-800'}`} onClick={() => handleItemClick(c)}>
                            {c?.checkpoint?.picture && <img src={c?.checkpoint?.picture?.includes('http') ? c?.checkpoint.picture : imgSource} alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>}
                            {!c?.checkpoint?.picture && <img src='/icon.jpg' alt="" className='inline object-cover w-16 h-16 mr-2 rounded-full'/>}
                            <div className='pr-10'>
                                {c.checkpoint.icon.includes('challenge') && (
                                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mb-1">[RETO]</span>
                                )}
                                <span className="font-bold text-white uppercase tracking-tight block">{c.checkpoint.name}</span>
                                <p className="text-xs text-neutral-500 line-clamp-1">{c.checkpoint.description}</p>
                                <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-widest">
                                    <span className="text-yellow-500">{c.points ?? 0}</span> pts | <span className="text-yellow-500">{c.distance.toFixed(2)}km</span> Distancia
                                </p>
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
                <div className="flex flex-col items-center justify-center py-20 bg-neutral-900 rounded-2xl border border-neutral-800 border-dashed">
                    <span className="text-4xl mb-4">📍</span>
                    <h6 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">No se encontraron checkins</h6>
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
            className="z-[60]"
        >
            <div className='flex gap-4 mb-6'>
                <div className='flex flex-1 items-center px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-2xl'>
                    <img src="/check-in.png" alt="" className="w-5 h-5 mr-3"/>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Checkpoint</span>
                </div>
                <div className='flex flex-1 items-center px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-2xl'>
                    <img src="/pin.png" alt="" className="w-5 h-5 mr-3"/>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">CheckIn Original</span>
                </div>
                <div className='flex flex-1 items-center px-4 py-3 bg-neutral-800 border border-neutral-800 rounded-2xl'>
                    <img src="/pin-black.png" alt="" className="w-5 h-5 mr-3"/>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Checkin Actualizado</span>
                </div>
            </div>

            <div className='flex h-vp-60'>
                <div className='w-4/12   overflow-auto '>
                    {renderContent()}
                </div>
                <div className='w-full flex flex-col overflow-auto bg-neutral-900 rounded-[2rem] border border-neutral-800 p-6'>
                    {selectedCheckIn && <div className='text-[10px] uppercase font-bold tracking-widest text-yellow-500 mb-4 ml-1'>Registro de Fechas</div>}
                    {selectedCheckIn && (
                        <div className='grid grid-cols-3 gap-6 mb-8 px-4'>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Original</span>
                                <span className="text-xs font-bold text-neutral-300 capitalize">{moment(selectedCheckIn.id).format('dddd DD MMM, h:mm A')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Creación</span>
                                <span className="text-xs font-bold text-neutral-300 capitalize">{moment(selectedCheckIn.created_at).format('dddd DD MMM, h:mm A')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-1">Actualización</span>
                                <span className="text-xs font-bold text-neutral-300 capitalize">{moment(selectedCheckIn.updated_at).format('dddd DD MMM, h:mm A')}</span>
                            </div>
                        </div>
                    )}
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
