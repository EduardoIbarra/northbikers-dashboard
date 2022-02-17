import Modal from "../modal";
import TextInput from "../../input";
import Select from "../../select";
import {getSupabase} from "../../../utils/supabase";
import {useCallback, useEffect, useState} from "react";

const AddParticipantModal = ({isOpen, onClose}) => {
    const supabase = getSupabase();
    const [routes, setRoutes] = useState([]);


    const getRoutes = useCallback(async () => {
        try {
            const {data} = await supabase.from("routes").select()
            console.log({data});

            if (data) {
                setRoutes(data)
            }
        } catch (e) {
            console.log("Error", e);
            setRoutes([])
        }
    }, [])


    useEffect(() => {
        if(isOpen) getRoutes()
    }, [isOpen])


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            shouldDismissOnBackdrop={false}
            title='Nuevo participante'
            subtitle='Registra nuevo participante a la ruta.'
            okButton={{
                onClick: onClose,
                label: 'Registrar',
            }}
            cancelButton={{
                onClick: onClose,
                label: 'Cancelar',
            }}
        >
            <div>
                <TextInput label={'ID perfil'} />
                <Select label={'Ruta'} placeholder='Selecciona ruta' items={routes}/>
                <div className='flex flex-row space-around gap-2'>
                    <TextInput label={'Latitud'} />
                    <TextInput label={'Longitud'} />
                </div>
                <TextInput label={'Puntos'} />
                <TextInput label={'Número participante'} />
            </div>
        </Modal>
    )
}

export default AddParticipantModal
