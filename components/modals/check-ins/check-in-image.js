import Button from "../../button";
import {getSupabase} from "../../../utils/supabase";
import Modal from "../modal";
import {useState} from "react";

const CheckInImage = ({checkIn, onSuccess}) => {
    const supabase = getSupabase();
    const [isOpen, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleToggleValidCheckIn = async () => {
        setOpen(true)
        setIsSaving(true)
        try {
            const {data, error} = await supabase
                .from('check_ins')
                .update({
                    is_valid: !checkIn?.is_valid
                })
                .match({id: checkIn.id})
            onSuccess()
            console.log(data);
        } catch (e) {
            console.log("Error", e);
        }
        setOpen(false)
        setIsSaving(false)
    }

    const toggleModal = () => {
        setOpen(!isOpen)
    }


    const imgSource = `https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/${checkIn?.picture}`
    return (
        <div>
                <div className='rounded'>
                    <Button onClick={toggleModal} className='w-full mx-1 mb-1' color={checkIn?.is_valid ? 'red' : 'blue'}>{checkIn?.is_valid ? 'invalidar' : 'validar'}</Button>
            {checkIn?.picture && (
                    <img className='w-full cursor-pointer' src={imgSource} onClick={() => window.open(imgSource, '_blank')}/>
                    )}
                    </div>

            <Modal
                title={`¿Seguro quieres ${checkIn?.is_valid ? 'invalidar' : 'validar'}?`}
                subtitle={`Si ${checkIn?.is_valid ? 'invalidas' : 'validas'}, se le ${checkIn?.is_valid ? 'restarán' : 'sumarán'} ${checkIn?.checkpoint.points} puntos de este checkpoint.`}
                isOpen={isOpen}
                onClose={toggleModal}
                okButton={{
                    label: isSaving ? 'actualizando...' : checkIn?.is_valid ? 'invalidar' : 'validar',
                    onClick: handleToggleValidCheckIn
                }}
                cancelButton={isSaving ? null : {
                    label: 'Cerrar',
                    onClick: toggleModal
                }}
            />
        </div>
    )
}

export default CheckInImage
