import Modal from "../modal";
import TextInput from "../../input";
import Select from "../../select";
import {useRecoilValue} from "recoil";

import {useEffect, useState} from "react";
import Button from "../../button";
import {AiOutlineSearch} from "react-icons/ai";
import SearchUserModal from "./user-search";
import {CurrentRoute} from "../../../store/atoms/global";
import {getSupabase} from "../../../utils/supabase";
import {CATEGORIES, GENDERS} from "../../../utils";
import Alert from "../../alerts";
import {FiAlertCircle} from "react-icons/fi";

const AddParticipantModal = ({isOpen, onClose, allList = [], user}) => {
    const supabase = getSupabase();
    const [isSearchModalOpen, setIsOpen] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        current_lng: 25.6487281,
        current_lat: -100.4431815
    });
    const [selectedUser, setSelectedUser] = useState({});
    const currentRoute = useRecoilValue(CurrentRoute);
    console.log({user})
    const saveFormData = (key, value) => {
        setShowAlert(false)
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
        if (allList.some(({profile}) => profile.id === selectedUser.id) && !user) {
            return setShowAlert(true)
        }

        setIsSaving(true)
        try {
            await supabase.from('event_profile').upsert([{...formData, route_id: currentRoute.id}])
            onClose()
            clearData()
        } catch (e) {
            console.log("ERROR SAVING", e);
        }
        setIsSaving(false)
        setShowAlert(false)
    }

    useEffect(() => {
        if (user) {
            setSelectedUser(user.profile)
            setFormData({
                ...formData,
                id: user.id,
                current_lat: user.current_lat,
                current_lng: user.current_lng,
                points: user.points,
                participant_number: user.participant_number,
                category: user.category,
                gender: user.gender,
            })
        }
        if (user) {
            setShowAlert(false)
        }
    }, [user])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            shouldDismissOnBackdrop={false}
            title={user ? 'Editar participante...' : 'Nuevo participante'}
            subtitle={user ? 'Edita información del participante' : 'Registra nuevo participante a la ruta.'}
            okButton={{
                onClick: handleSave,
                label: isSaving ? user ? 'Editando...' : 'Registrando..' : user ? 'Editar' : 'Registrar',
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
                {showAlert ? (
                    <>
                        <Alert
                            onClose={() => setShowAlert(false)}
                            size="sm"
                            color="bg-red-500 text-white"
                            icon={<FiAlertCircle className="mr-2 stroke-current h-4 w-4"/>}>
                            El usuario ya está registrado en el evento
                        </Alert>
                        <br/>
                    </>

                ) : null}
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
                    <Select label={'Categoría'} placeholder='Selecciona Categoría' items={CATEGORIES} inline onChange={(e) => saveFormData('category', e.id)}/>
                    <Select label={'Género'} placeholder='Selecciona Categoría' items={GENDERS} inline onChange={(e) => saveFormData('gender', e.id)}/>
                </div>
            </div>
            <SearchUserModal isOpen={isSearchModalOpen} onClose={handleToggleModal} onSelect={handleSelectUser}/>
        </Modal>
    )
}

export default AddParticipantModal
