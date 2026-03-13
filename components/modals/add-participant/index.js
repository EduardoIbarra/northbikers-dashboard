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
                    await fetch('https://www.northbikers.com/api/send_confirmation_email', {
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
        console.log(user);
        setSelectedUser(user);
        setFormData({
            ...formData,
            profile_id: user.id,  // Always set profile_id when a user is selected
            full_name: user.name,  // Map user.name to full_name
            stripe_webhook_email_notification: user.email,  // Map user.email
            name_on_jersey: user.latestEventProfile?.name_on_jersey,
            jersey_size: user.latestEventProfile?.jersey_size,
            motorcycle: user.latestEventProfile?.motorcycle,
            city: user.latestEventProfile?.city,
            birthday: user.latestEventProfile?.birthday,
            phone: user.latestEventProfile?.phone,
            emergencyContactName: user.latestEventProfile?.emergencyContactName,
            emergencyContactPhone: user.latestEventProfile?.emergencyContactPhone,
            emergencyContactRelation: user.latestEventProfile?.emergencyContactRelation,
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
            size="5xl"
            shouldDismissOnBackdrop={false}
            title={user ? 'Gestionar Participante' : 'Nuevo Registro'}
            subtitle={user ? 'Actualiza los detalles y el estado del piloto.' : 'Inscribe a un nuevo piloto en la ruta seleccionada.'}
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
            <div className="space-y-6 pb-2">
                {/* Header Information */}
                <div className="flex items-center justify-between bg-white/[0.03] p-5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-blue-400/80 mb-1">Ruta del Evento</span>
                        <span className="text-xl font-black text-white uppercase tracking-tight leading-none">{currentRoute.title}</span>
                    </div>
                    {formData?.participant_number > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-gray-500 mb-1">Dorsal</span>
                            <span className="text-3xl font-mono font-black text-blue-500 leading-none">#{formData?.participant_number}</span>
                        </div>
                    )}
                </div>

                {showAlert && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <Alert
                            onClose={() => setShowAlert(false)}
                            size="sm"
                            color="bg-red-500/10 text-red-400 border border-red-500/20"
                            icon={<FiAlertCircle className="mr-2 h-4 w-4" />}>
                            Este usuario ya cuenta con un registro activo para esta ruta.
                        </Alert>
                    </div>
                )}

                {/* Profile Section */}
                <div className="space-y-4 pt-2">
                    <div className='flex flex-col md:flex-row gap-3 items-end'>
                        <div className="flex-1 w-full">
                            <TextInput 
                                label={'Usuario en Sistema'} 
                                disabled 
                                value={selectedUser?.name || 'Seleccione un perfil...'} 
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <Button 
                            className='h-[42px] px-8 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all flex items-center space-x-2' 
                            onClick={handleToggleModal}
                        >
                            <AiOutlineSearch size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Buscar</span>
                        </Button>
                    </div>
                </div>

                <div className="h-px bg-white/5 mx-2" />

                {/* Category & Mode Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Categoría</span>
                        <Select
                            selected={formData?.category}
                            placeholder='Seleccionar'
                            items={[
                                { id: 'DUAL_SPORT', label: 'Doble propósito', title: 'Doble propósito' },
                                { id: 'DIRT', label: 'Terracería', title: 'Terracería' },
                                { id: 'STREET', label: 'Carretera', title: 'Carretera' },
                            ]}
                            className="bg-white/5 border-white/10 rounded-xl"
                            onChange={(e) => saveFormData('category', e.id)}
                        />
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Modalidad</span>
                        <Select
                            selected={formData?.mode}
                            placeholder='Seleccionar'
                            items={[
                                { id: 'Individual', label: 'Individual', title: 'Individual' },
                                { id: 'Pareja', label: 'Pareja', title: 'Pareja' },
                                { id: 'Equipo', label: 'Equipo', title: 'Equipo' },
                            ]}
                            className="bg-white/5 border-white/10 rounded-xl"
                            onChange={(e) => {
                                saveFormData('mode', e.id);
                                saveFormData('is_couple', e.id === 'Pareja');
                                saveFormData('is_team', e.id === 'Equipo');
                            }}
                        />
                    </div>
                </div>

                {/* Personal & Jersey Details */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400/60 mb-6 flex items-center">
                        <span className="w-1 h-3 bg-blue-500/50 rounded-full mr-3"></span>
                        DETALLES DEL PILOTO
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <TextInput label={'Nombre en Jersey'} value={formData?.name_on_jersey} onChange={(e) => saveFormData('name_on_jersey', e)} placeholder="EJ. JHON DOE" />
                        <TextInput label={'Talla de Jersey'} value={formData?.jersey_size} onChange={(e) => saveFormData('jersey_size', e)} placeholder="EJ. XL" />
                        <TextInput label={'Motocicleta (Modelo/CC)'} value={formData?.motorcycle} onChange={(e) => saveFormData('motorcycle', e)} placeholder="EJ. BMW R1250GS" />
                        <TextInput label={'Ciudad de Origen'} value={formData?.city} onChange={(e) => saveFormData('city', e)} placeholder="EJ. MONTERREY" />
                        <TextInput label={'Fecha de Nacimiento'} type='date' value={formData?.birthday} onChange={(e) => saveFormData('birthday', e)} />
                        <TextInput label={'Teléfono'} value={formData?.phone} onChange={(e) => saveFormData('phone', e)} placeholder="EJ. 811XXXXXXX" />
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400/60 mb-6 flex items-center">
                        <span className="w-1 h-3 bg-red-500/50 rounded-full mr-3"></span>
                        CONTACTO DE EMERGENCIA
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <TextInput label={'Nombre Completo'} value={formData?.emergencyContactName} onChange={(e) => saveFormData('emergencyContactName', e)} placeholder="NOMBRE DEL CONTACTO" />
                        </div>
                        <TextInput label={'Teléfono'} value={formData?.emergencyContactPhone} onChange={(e) => saveFormData('emergencyContactPhone', e)} placeholder="TELÉFONO" />
                        <TextInput label={'Relación/Parentesco'} value={formData?.emergencyContactRelation} onChange={(e) => saveFormData('emergencyContactRelation', e)} placeholder="EJ. ESPOSA" />
                    </div>
                </div>

                {/* Assets & Verification */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center space-x-4">
                        <div className="relative group">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 flex items-center justify-center">
                                {formData?.avatar_url ? (
                                    <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <span className="text-gray-600 text-[10px] font-bold">FOTO</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-2">Fotografía</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-[10px] text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-center">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <input 
                                type='checkbox' 
                                className="mt-1 form-checkbox h-5 w-5 text-blue-500 rounded border-white/10 bg-black/40 focus:ring-0 transition-all" 
                                checked={termsAgreed} 
                                onChange={() => setTermsAgreed(!termsAgreed)} 
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-200 group-hover:text-white transition-colors uppercase tracking-widest">Acepto el Reglamento</span>
                                <span className="text-[9px] text-gray-500 leading-tight mt-1">Confirmo que el piloto acepta los términos y condiciones.</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            <SearchUserModal isOpen={isSearchModalOpen} onClose={handleToggleModal} onSelect={handleSelectUser} />
        </Modal>
    );
};

export default AddParticipantModal;