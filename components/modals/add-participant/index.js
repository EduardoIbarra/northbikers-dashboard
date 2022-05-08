import Modal from "../modal";
import TextInput from "../../input";
import Select from "../../select";
import {useRecoilValue} from "recoil";

import {useState} from "react";
import Button from "../../button";
import {AiOutlineSearch} from "react-icons/ai";
import SearchUserModal from "./user-search";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";

const AddParticipantModal = ({isOpen, onClose}) => {
    const supabase = getSupabase();
    const categories = [
        {id: 'DUAL_SOPORT', title: 'Doble Propósito'}, 
        {id: 'DIRT', title: 'Terracería'}, 
        {id: 'STREET', title: 'Calle'},
    ];
    const genders = [
        {id: 'MALE', title: 'Hombre'}, 
        {id: 'FEMALE', title: 'Mujer'},
    ];
    const [isSearchModalOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        current_lng: 25.6487281,
        current_lat: -100.4431815
    });
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


    const clearData = () => {
        setFormData({})
        setSelectedUser({})
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await supabase.from('event_profile').insert([{...formData, route_id: currentRoute.id}])
            onClose()
            clearData()
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
                onClick: () => {
                    onClose()
                    clearData()
                },
                label: 'Cancelar',
            }}
        >
            <div>
                <h6>Ruta: {currentRoute.title}</h6>
                <br/>
                <div className='flex flex-row space-around gap-2 items-center'>
                    <TextInput label={'Buscar Perfil'} disabled value={selectedUser?.name}/>
                    <Button className='h-[36px] mt-2.5' color='black' onClick={handleToggleModal}>
                        <AiOutlineSearch size={15}/>
                    </Button>
                </div>
                <div className='flex flex-row space-around gap-2'>
                    <TextInput label={'Latitud'} type='number' value={formData?.current_lat} onChange={(e) => saveFormData('current_lat', e)}/>
                    <TextInput label={'Longitud'} type='number' value={formData?.current_lng} onChange={(e) => saveFormData('current_lng', e)}/>
                </div>
                <TextInput label={'Puntos'} type='number' value={formData?.points} onChange={(e) => saveFormData('points', e)}/>
                <TextInput label={'Número participante'} type='number' value={formData?.participant_number} onChange={(e) => saveFormData('participant_number', e)}/>
                {/* <TextInput label={'Categoría'} value={formData?.category} onChange={(e) => saveFormData('category', e)}/> */}

                <div className='flex flex-row space-around gap-2'>
                    <Select label={'Categoría'} placeholder='Selecciona Categoría' items={categories} inline onChange={(e) => saveFormData('category', e.id)}/>
                    <Select label={'Género'} placeholder='Selecciona Categoría' items={genders} inline onChange={(e) => saveFormData('gender', e.id)}/>
                </div>
            </div>
            <SearchUserModal isOpen={isSearchModalOpen} onClose={handleToggleModal} onSelect={handleSelectUser}/>
        </Modal>
    )
}

export default AddParticipantModal
