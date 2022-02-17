import Modal from "../modal";
import TextInput from "../../input";
import {useRecoilValue} from "recoil";

import {useState} from "react";
import Button from "../../button";
import {AiOutlineSearch} from "react-icons/ai";
import SearchUserModal from "./user-search";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";

const AddParticipantModal = ({isOpen, onClose}) => {
    const supabase = getSupabase();
    const [isSearchModalOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [selectedUser, setSelectedUser] = useState({});
    const currentRoute = useRecoilValue(CurrentRoute);

    const saveFormData = (key, value) => {
        setFormData({
            ...formData,
            [key]: value
        })
    }

    const handleToggleModal = () => {
        setIsOpen(!isSearchModalOpen)
    }
    const handleSelectUser = (user) => {
        saveFormData('profile_id', user.id)
        setSelectedUser(user)
        handleToggleModal()
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await supabase.from('event_profile').insert([{...formData, route_id: currentRoute.id}])
            onClose()
        } catch (e) {
            console.log("ERROR SAVING", e);
        }
        setIsSaving(false)
    }


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            shouldDismissOnBackdrop={false}
            title='Nuevo participante'
            subtitle='Registra nuevo participante a la ruta.'
            okButton={{
                onClick: handleSave,
                label: isSaving ? 'Registrando..' : 'Registrar',
            }}
            cancelButton={isSaving ? null : {
                onClick: () => onClose(),
                label: 'Cancelar',
            }}
        >
            <div>
                <h6>Ruta: {currentRoute.title}</h6>
                <br/>
                <div className='flex flex-row space-around gap-2 items-center'>
                    <TextInput label={'Buscar Perfil'} disabled value={selectedUser?.name}/>
                    <Button className='h-[36px] mt-2.5' onClick={handleToggleModal}>
                        <AiOutlineSearch size={15}/>
                    </Button>
                </div>
                <div className='flex flex-row space-around gap-2'>
                    <TextInput label={'Latitud'} type='number' value={formData?.current_lat} onChange={(e) => saveFormData('current_lat', e)}/>
                    <TextInput label={'Longitud'} type='number' value={formData?.current_lng} onChange={(e) => saveFormData('current_lng', e)}/>
                </div>
                <TextInput label={'Puntos'} type='number' value={formData?.points} onChange={(e) => saveFormData('points', e)}/>
                <TextInput label={'Número participante'} type='number' value={formData?.participant_number} onChange={(e) => saveFormData('participant_number', e)}/>
                <TextInput label={'Categoría'} value={formData?.category} onChange={(e) => saveFormData('category', e)}/>
            </div>
            <SearchUserModal isOpen={isSearchModalOpen} onClose={handleToggleModal} onSelect={handleSelectUser}/>
        </Modal>
    )
}

export default AddParticipantModal
