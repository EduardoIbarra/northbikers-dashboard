import Modal from "../modal";
import TextInput from "../../input";
import Select from "../../select";
import { useRecoilValue } from "recoil";
import { useEffect, useState } from "react";
import Button from "../../button";
import { AiOutlineSearch } from "react-icons/ai";
import SearchUserModal from "./user-search";
import { CurrentRoute } from "../../../store/atoms/global";
import { getSupabase } from "../../../utils/supabase";
import { CATEGORIES, GENDERS } from "../../../utils";
import Alert from "../../alerts";
import { FiAlertCircle } from "react-icons/fi";

const AddParticipantModal = ({ isOpen, onClose, allList = [], user }) => {
    const supabase = getSupabase();
    const [isSearchModalOpen, setIsOpen] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);  // Added for terms agreement checkbox
    const [formData, setFormData] = useState({
        payment_status: 'promo',  // Always set payment_status to 'promo'
        category: 'DUAL_SPORT',  // Default category
        mode: 'Individual',      // Default participation mode
    });
    const [selectedUser, setSelectedUser] = useState({});
    const [avatarFile, setAvatarFile] = useState(null); // State to hold the selected file
    const currentRoute = useRecoilValue(CurrentRoute);

    const saveFormData = (key, value) => {
        setShowAlert(false);
        setFormData({
            ...formData,
            [key]: value
        });
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setAvatarFile(file);
    };

    const uploadAvatar = async (file) => {
        const fileName = `${Date.now()}_${file.name}`; // Generate unique file name

        // Upload the file to the storage bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`avatars/${fileName}`, file);

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            throw uploadError;
        }

        // Retrieve the public URL of the uploaded file
        const { data: publicUrlData, error: publicUrlError } = supabase.storage
            .from('avatars')
            .getPublicUrl(`avatars/${fileName}`);

        if (publicUrlError) {
            console.error('Error getting public URL:', publicUrlError);
            throw publicUrlError;
        }

        return publicUrlData.publicURL; // Return the public URL
    };


    const handleToggleModal = () => {
        setIsOpen(!isSearchModalOpen);
    };

    const clearData = () => {
        setFormData({
            payment_status: 'promo',
            category: 'DUAL_SPORT',
            mode: 'Individual',
        });
        setSelectedUser({});
        setAvatarFile(null);
    };

    const handleSave = async () => {
        if (!selectedUser?.id) {
            console.log("No user selected!");
            return;
        }

        setIsSaving(true);

        try {
            let avatarUrl = formData.avatar_url;
            if (avatarFile) {
                avatarUrl = await uploadAvatar(avatarFile);
                saveFormData('avatar_url', avatarUrl);
            }

            // Step 1: Check if any records with the same profile_id and route_id exist
            const { data: existingProfiles, error: checkError } = await supabase
                .from('event_profile')
                .select('id, participant_number')
                .eq('profile_id', selectedUser.id)
                .eq('route_id', currentRoute.id);

            if (checkError) {
                console.error("Error checking existing profiles:", checkError);
                setIsSaving(false);
                return;
            }

            // Step 2: If any of the existing profiles have participant_number > 0, show alert and do not save
            const validProfile = existingProfiles.find(profile => profile.participant_number > 0);
            if (validProfile) {
                setShowAlert(true);
                setIsSaving(false);
                return;
            }

            // Step 3: Delete all records with participant_number === 0 or null
            const invalidProfiles = existingProfiles.filter(profile => !profile.participant_number || profile.participant_number === 0);
            if (invalidProfiles.length > 0) {
                const { error: deleteError } = await supabase
                    .from('event_profile')
                    .delete()
                    .in('id', invalidProfiles.map(profile => profile.id));  // Delete by array of IDs

                if (deleteError) {
                    console.error("Error deleting invalid profiles:", deleteError);
                    setIsSaving(false);
                    return;
                }
            }

            // Step 4: Get the largest participant_number for the current route and assign +1
            const { data: maxNumberData, error: maxNumberError } = await supabase
                .from('event_profile')
                .select('participant_number')
                .eq('route_id', currentRoute.id)
                .order('participant_number', { ascending: false })
                .limit(1);

            let nextParticipantNumber = 1;  // Default to 1 if no records exist
            if (!maxNumberError && maxNumberData && maxNumberData.length > 0) {
                nextParticipantNumber = maxNumberData[0].participant_number + 1;
            }

            // Step 5: Prepare the payload for saving (remove mode field)
            const { mode, ...filteredFormData } = {
                ...formData,
                profile_id: selectedUser.id,  // Ensure profile_id is set
                participant_number: nextParticipantNumber, // Assign next available participant number
                avatar_url: avatarUrl,
            };

            // Step 6: Perform the insert operation
            const { data: upsertedData, error: insertError } = await supabase
                .from('event_profile')
                .upsert([{
                    ...filteredFormData,
                    route_id: currentRoute.id
                }]);

            if (insertError) {
                console.error("Error inserting/upserting profile:", insertError);
                setIsSaving(false);
                return;
            }

            // Step 7: Call the email confirmation endpoint with the upserted event_profile id
            const upsertedProfileId = upsertedData?.[0]?.id;  // Assuming upsertedData contains the new event_profile id
            if (upsertedProfileId) {
                try {
                    await fetch('https://api.northbikers.com/api/send_confirmation_email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            eventProfileId: upsertedProfileId,  // Send the just upserted profile id
                        }),
                    });
                    console.log('Confirmation email sent successfully.');
                } catch (emailError) {
                    console.error('Error sending confirmation email:', emailError);
                }
            }

            // Step 8: Close the modal and reset form data
            onClose();
            clearData();
        } catch (e) {
            console.log("ERROR SAVING", e);
        }

        setIsSaving(false);
        setShowAlert(false);
    };



    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setFormData({
            ...formData,
            profile_id: user.id,  // Always set profile_id when a user is selected
            full_name: user.name,  // Map user.name to full_name
            stripe_webhook_email_notification: user.email,  // Map user.email
            avatar_url: user.avatar_url !== "https://cdn1.iconfinder.com/data/icons/avatars-55/100/avatar_profile_user_biker_tanktop_bald_shiny-512.png"
                ? user.avatar_url
                : formData.avatar_url
        });
        handleToggleModal();
    };


    useEffect(() => {
        if (user) {
            setSelectedUser(user.profile);
            console.log('profile', user.profile);
            setFormData({
                ...formData,
                // id: user.id,
                // points: user.points,
                profile_id: user.id,
                participant_number: formData.participant_number,
                category: user.category,
                gender: user.gender,
                name_on_jersey: user.name_on_jersey,
                jersey_size: user.jersey_size,
                motorcycle: user.motorcycle,
                city: user.city,
                birthday: user.birthday,
                phone: user.phone,
                emergencyContactName: user.emergencyContactName,
                emergencyContactPhone: user.emergencyContactPhone,
                emergencyContactRelation: user.emergencyContactRelation,
            });
        }
        if (user) {
            setShowAlert(false);
        }
    }, [user]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            shouldDismissOnBackdrop={false}
            title={user ? 'Editar participante...' : 'Nuevo participante'}
            subtitle={user ? 'Edita información del participante' : 'Registra nuevo participante a la ruta.'}
            okButton={{
                disabled: !selectedUser?.id || !termsAgreed,
                onClick: handleSave,
                label: isSaving ? (user ? 'Editando...' : 'Registrando..') : (user ? 'Editar' : 'Registrar'),
            }}
            cancelButton={isSaving ? null : {
                onClick: () => {
                    onClose();
                    setTimeout(clearData, 500);
                },
                label: 'Cancelar',
            }}
        >
            <div>
                <h6>Ruta: {currentRoute.title}</h6>
                <br />
                {showAlert && (
                    <>
                        <Alert
                            onClose={() => setShowAlert(false)}
                            size="sm"
                            color="bg-red-500 text-white"
                            icon={<FiAlertCircle className="mr-2 stroke-current h-4 w-4" />}>
                            El usuario ya está registrado en el evento
                        </Alert>
                        <br />
                    </>
                )}
                <div className='flex flex-row space-around gap-2 items-center'>
                    <TextInput label={'Buscar Perfil'} disabled value={selectedUser?.name} />
                    <Button className='h-[36px] mt-2.5' color='black' onClick={handleToggleModal}>
                        <AiOutlineSearch size={15} />
                    </Button>
                </div>
                {/* <TextInput label={'Puntos'} type='number' value={formData?.points} onChange={(e) => saveFormData('points', e)}/> */}
                <TextInput label={'Participante # (generado en automático)'} type='number' value={formData?.participant_number} readonly disabled />

                <div className='flex flex-row space-around gap-2'>
                    <Select
                        selected={formData?.category}
                        label={'Categoría'}
                        placeholder='Selecciona Categoría'
                        items={[
                            { id: 'DUAL_SPORT', label: 'Doble propósito', title: 'Doble propósito' },
                            { id: 'DIRT', label: 'Terracería', title: 'Terracería' },
                            { id: 'STREET', label: 'Carretera', title: 'Carretera' },
                        ]}
                        inline
                        onChange={(e) => saveFormData('category', e.id)} // Use e.id now
                    />

                    <Select
                        selected={formData?.mode}
                        label={'Modo de Participación'}
                        placeholder='Selecciona Modo'
                        items={[
                            { id: 'Individual', label: 'Individual', title: 'Individual' },
                            { id: 'Pareja', label: 'Pareja (set is_couple to TRUE)', title: 'Pareja' },
                            { id: 'Equipo', label: 'Equipo (set is_team to TRUE)', title: 'Equipo' },
                        ]}
                        inline
                        onChange={(e) => {
                            saveFormData('mode', e.id);
                            if (e.id === 'Pareja') saveFormData('is_couple', true);
                            if (e.id === 'Equipo') saveFormData('is_team', true);
                        }}
                    />

                </div>

                {/* New fields */}
                <TextInput label={'Nombre en Jersey'} value={formData?.name_on_jersey} onChange={(e) => saveFormData('name_on_jersey', e)} />
                <TextInput label={'Tamaño del Jersey'} value={formData?.jersey_size} onChange={(e) => saveFormData('jersey_size', e)} />
                <TextInput label={'Motocicleta'} value={formData?.motorcycle} onChange={(e) => saveFormData('motorcycle', e)} />
                <TextInput label={'Ciudad'} value={formData?.city} onChange={(e) => saveFormData('city', e)} />
                <TextInput label={'Fecha de Nacimiento'} type='date' value={formData?.birthday} onChange={(e) => saveFormData('birthday', e)} />
                <TextInput label={'Teléfono'} value={formData?.phone} onChange={(e) => saveFormData('phone', e)} />
                <TextInput label={'Contacto de Emergencia'} value={formData?.emergencyContactName} onChange={(e) => saveFormData('emergencyContactName', e)} />
                <TextInput label={'Teléfono de Emergencia'} value={formData?.emergencyContactPhone} onChange={(e) => saveFormData('emergencyContactPhone', e)} />
                <TextInput label={'Relación con Contacto de Emergencia'} value={formData?.emergencyContactRelation} onChange={(e) => saveFormData('emergencyContactRelation', e)} />
                <hr />
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Subir Avatar
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="mt-2 border rounded-md p-2"
                    />
                </div>

                {/* Terms agreement checkbox */}
                <div className='flex items-center'>
                    <input type='checkbox' checked={termsAgreed} onChange={() => setTermsAgreed(!termsAgreed)} />
                    <label className='ml-2'>Acepto los términos y condiciones</label>
                </div>

                {showAlert && (
                    <>
                        <Alert
                            onClose={() => setShowAlert(false)}
                            size="sm"
                            color="bg-red-500 text-white"
                            icon={<FiAlertCircle className="mr-2 stroke-current h-4 w-4" />}>
                            El usuario ya está registrado en el evento
                        </Alert>
                        <br />
                    </>
                )}
            </div>
            <SearchUserModal isOpen={isSearchModalOpen} onClose={handleToggleModal} onSelect={handleSelectUser} />
        </Modal>
    );
};

export default AddParticipantModal;