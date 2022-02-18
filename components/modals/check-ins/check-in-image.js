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
                    is_valid: !checkIn?.is_valid,
                    points: checkIn?.is_valid ? (checkIn.points - checkIn?.checkpoint.points) : (checkIn.points + checkIn?.checkpoint.points)
                })
                .match({id: checkIn.id})
            console.log(data);
        } catch (e) {
            console.log("Error", e);
        }
        onSuccess()
        setOpen(false)
        setIsSaving(false)
    }

    const toggleModal = () => {
        setOpen(!isOpen)
    }


    return (
        <div>
            {checkIn?.picture && (
                <div className='my-2 rounded'>
                    <img className='w-full' src={`https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/${checkIn?.picture}`}/>
                    <br/>
                    <Button onClick={toggleModal} color={checkIn?.is_valid ? 'red' : 'blue'}>{checkIn?.is_valid ? 'invalidar' : 'validar'}</Button>
                </div>
            )}

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
