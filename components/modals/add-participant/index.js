import Modal from "../modal";
import TextInput from "../../input";

const AddParticipantModal = ({isOpen, onClose}) => {
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
                <TextInput label={'ID ruta'} />
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
