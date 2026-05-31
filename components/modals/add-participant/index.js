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
        gender: 'MALE',          // Default gender
    });
    const [selectedUser, setSelectedUser] = useState({});
    const [avatarFile, setAvatarFile] = useState(null); // State to hold the selected file
    const currentRoute = useRecoilValue(CurrentRoute);

    const [coupleData, setCoupleData] = useState({
        email: '',
        full_name: '',
        phone: '',
        name_on_jersey: '',
        jersey_size: '',
        gender: 'FEMALE',
        city: '',
        birthday: ''
    });
    const [coupleCreationMode, setCoupleCreationMode] = useState('merge'); // 'merge' or 'manual'
    const [coupleSearchQuery, setCoupleSearchQuery] = useState('');
    const [alertMessage, setAlertMessage] = useState('');

    const saveFormData = (key, value) => {
        setShowAlert(false);
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
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
            gender: 'MALE',
        });
        setSelectedUser({});
        setAvatarFile(null);
        setCoupleData({
            email: '',
            full_name: '',
            phone: '',
            name_on_jersey: '',
            jersey_size: '',
            gender: 'FEMALE',
            city: '',
            birthday: ''
        });
        setCoupleCreationMode('merge');
        setCoupleSearchQuery('');
        setAlertMessage('');
    };

    const saveCoupleFormData = (key, value) => {
        setCoupleData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const foundCouple = allList.find(item => {
        if (!item || (formData.id && item.id === formData.id)) return false;
        const target = coupleSearchQuery?.trim()?.toLowerCase();
        if (!target) return false;
        if (item.participant_number?.toString() === target) return true;
        if (item.stripe_webhook_email_notification?.toLowerCase() === target) return true;
        if (item.profile?.email?.toLowerCase() === target) return true;
        return false;
    });

    const handleSave = async () => {
        if (!selectedUser?.id) {
            console.log("No user selected!");
            return;
        }

        if (formData.is_couple && coupleCreationMode === 'merge' && !foundCouple) {
            setAlertMessage("Debes seleccionar una pareja válida.");
            setShowAlert(true);
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
            // (But ignore if we are editing the same record)
            const validProfile = existingProfiles.find(profile => profile.participant_number > 0 && profile.id !== formData.id);
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

            // Step 4: Get the largest participant_number for the current route and assign +1 (ONLY FOR NEW RECORDS)
            let nextParticipantNumber = formData.participant_number;
            if (!formData.id) {
                const { data: maxNumberData, error: maxNumberError } = await supabase
                    .from('event_profile')
                    .select('participant_number')
                    .eq('route_id', currentRoute.id)
                    .order('participant_number', { ascending: false })
                    .limit(1);

                nextParticipantNumber = 1;
                if (!maxNumberError && maxNumberData && maxNumberData.length > 0) {
                    nextParticipantNumber = (maxNumberData[0].participant_number || 0) + 1;
                }
            }

            // Step 5: Prepare the payload for saving (remove mode field)
            const { mode, ...filteredFormData } = {
                ...formData,
                profile_id: selectedUser.id,  // Ensure profile_id is set
                participant_number: nextParticipantNumber, // Assign next available participant number or keep existing
                avatar_url: avatarUrl,
            };

            // If manual couple creation is selected, override payment_status to 'promo'
            if (formData.is_couple && coupleCreationMode === 'manual') {
                filteredFormData.payment_status = 'promo';
            }

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

            const upsertedProfileId = upsertedData?.[0]?.id || formData.id;

            if (upsertedProfileId) {
                if (formData.is_couple) {
                    if (coupleCreationMode === 'merge' && foundCouple) {
                        const coupleRecord = {
                            event_profile_id: upsertedProfileId,
                            email: foundCouple.profile?.email || foundCouple.stripe_webhook_email_notification || '',
                            full_name: foundCouple.full_name || foundCouple.profile?.name || '',
                            phone: foundCouple.phone || '',
                            name_on_jersey: foundCouple.name_on_jersey || '',
                            jersey_size: foundCouple.jersey_size || '',
                            gender: foundCouple.gender || 'FEMALE',
                            city: foundCouple.city || '',
                            birthday: foundCouple.birthday || null,
                        };

                        const { data: existingCouples } = await supabase
                            .from('event_profile_couple')
                            .select('id')
                            .eq('event_profile_id', upsertedProfileId);
                        const existingCouple = existingCouples?.[0];

                        const { error: coupleError } = await supabase
                            .from('event_profile_couple')
                            .upsert([{
                                ...coupleRecord,
                                ...(existingCouple?.id ? { id: existingCouple.id } : {})
                            }]);

                        if (coupleError) {
                            console.error("Error upserting couple profile:", coupleError);
                        }

                        // Delete the merged couple from event_profile
                        const { error: deleteCoupleError } = await supabase
                            .from('event_profile')
                            .delete()
                            .eq('id', foundCouple.id);

                        if (deleteCoupleError) {
                            console.error("Error deleting merged couple from event_profile:", deleteCoupleError);
                        }
                    } else if (coupleCreationMode === 'manual') {
                        const coupleRecord = {
                            event_profile_id: upsertedProfileId,
                            email: coupleData.email,
                            full_name: coupleData.full_name,
                            phone: coupleData.phone,
                            name_on_jersey: coupleData.name_on_jersey,
                            jersey_size: coupleData.jersey_size,
                            gender: coupleData.gender,
                            city: coupleData.city,
                            birthday: coupleData.birthday || null,
                        };

                        const { data: existingCouples } = await supabase
                            .from('event_profile_couple')
                            .select('id')
                            .eq('event_profile_id', upsertedProfileId);
                        const existingCouple = existingCouples?.[0];

                        const { error: coupleError } = await supabase
                            .from('event_profile_couple')
                            .upsert([{
                                ...coupleRecord,
                                ...(existingCouple?.id ? { id: existingCouple.id } : {})
                            }]);

                        if (coupleError) {
                            console.error("Error upserting manual couple profile:", coupleError);
                        }
                    }
                } else {
                    // Clean up event_profile_couple record if it exists
                    await supabase
                        .from('event_profile_couple')
                        .delete()
                        .eq('event_profile_id', upsertedProfileId);
                }
            }

            // Step 7: Call the email confirmation endpoint with the upserted event_profile id
            if (upsertedProfileId) {
                try {
                    // Avoid CORS issues on localhost if possible, but still attempt the call
                    // We catch the error specifically to prevent the Next.js error overlay
                    const response = await fetch('https://www.northbikers.com/api/send_confirmation_email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            eventProfileId: upsertedProfileId,
                        }),
                    }).catch(err => {
                        console.warn('Network error or CORS block when sending confirmation email:', err);
                        return { ok: false };
                    });

                    if (response && response.ok) {
                        console.log('Confirmation email sent successfully.');
                    } else {
                        console.warn('Confirmation email endpoint returned an error or was blocked.');
                    }
                } catch (emailError) {
                    // Double-wrap to ensure no unhandled rejections bubble up to the dev overlay
                    console.error('Error in confirmation email process:', emailError);
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
            avatar_url: user.avatar_url !== "https://cdn1.iconfinder.com/data/icons/avatars-550/avatar_profile_user_biker_tanktop_bald_shiny-512.png"
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
                id: user.id,
                points: user.points,
                profile_id: user.profile_id,
                participant_number: user.participant_number,
                category: user.category,
                mode: user.is_couple ? 'Pareja' : (user.is_team ? 'Equipo' : 'Individual'),
                is_couple: user.is_couple,
                is_team: user.is_team,
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
                payment_status: user.payment_status || 'promo',
            });

            if (user.is_couple) {
                supabase
                    .from('event_profile_couple')
                    .select('*')
                    .eq('event_profile_id', user.id)
                    .then(({ data, error }) => {
                        const couple = data?.[0];
                        if (!error && couple) {
                            setCoupleData({
                                email: couple.email || '',
                                full_name: couple.full_name || '',
                                phone: couple.phone || '',
                                name_on_jersey: couple.name_on_jersey || '',
                                jersey_size: couple.jersey_size || '',
                                gender: couple.gender || 'FEMALE',
                                city: couple.city || '',
                                birthday: couple.birthday ? couple.birthday.split('T')[0] : '',
                            });
                            setCoupleCreationMode('manual');
                        }
                    });
            }
        }
        if (user) {
            setShowAlert(false);
        }
    }, [user]);

    const isSaveDisabled = !selectedUser?.id || !termsAgreed || (
        formData.is_couple && (
            (coupleCreationMode === 'merge' && !foundCouple) ||
            (coupleCreationMode === 'manual' && (!coupleData.full_name || !coupleData.email))
        )
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="5xl"
            shouldDismissOnBackdrop={false}
            title={user ? 'Gestionar Participante' : 'Nuevo Registro'}
            subtitle={user ? 'Actualiza los detalles and el estado del piloto.' : 'Inscribe a un nuevo piloto en la ruta seleccionada.'}
            okButton={{
                disabled: isSaveDisabled,
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
                <div className="flex items-center justify-between bg-neutral-800 p-6 rounded-[2rem] border border-neutral-800 shadow-inner">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-yellow-500 mb-1">Ruta del Evento</span>
                        <span className="text-xl font-black text-white uppercase tracking-tight leading-none">{currentRoute.title}</span>
                    </div>
                    {formData?.participant_number > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-neutral-500 mb-1">Dorsal</span>
                            <span className="text-3xl font-mono font-black text-yellow-500 leading-none">#{formData?.participant_number}</span>
                        </div>
                    )}
                </div>

                {showAlert && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <Alert
                            onClose={() => {
                                setShowAlert(false);
                                setAlertMessage('');
                            }}
                            size="sm"
                            color="bg-red-500 text-red-400 border border-red-500"
                            icon={<FiAlertCircle className="mr-2 h-4 w-4" />}>
                            {alertMessage || "Este usuario ya cuenta con un registro activo para esta ruta."}
                        </Alert>
                    </div>
                )}

                {/* Profile Selection Section */}
                <div className="space-y-3 pt-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Perfil del Participante</label>
                    <div 
                        onClick={handleToggleModal}
                        className={`group cursor-pointer flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all duration-300 ${
                            selectedUser?.id 
                            ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40 shadow-lg shadow-yellow-500/5' 
                            : 'bg-neutral-800 border-neutral-800 hover:border-neutral-700'
                        }`}
                    >
                        <div className="flex items-center space-x-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                selectedUser?.id 
                                ? 'bg-yellow-500 text-black shadow-xl shadow-yellow-500/20 rotate-3' 
                                : 'bg-neutral-700 text-neutral-500'
                            }`}>
                                <AiOutlineSearch size={28} className={selectedUser?.id ? '-rotate-3' : ''} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-lg font-black uppercase tracking-tight leading-tight ${selectedUser?.id ? 'text-white' : 'text-neutral-500'}`}>
                                    {selectedUser?.name || 'Vincular perfil de sistema...'}
                                </span>
                                {selectedUser?.email ? (
                                    <span className="text-xs text-yellow-500/70 font-bold lowercase italic tracking-wide mt-1">{selectedUser?.email}</span>
                                ) : (
                                    <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1">Busca por nombre o correo</span>
                                )}
                            </div>
                        </div>
                        <div className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl border transition-all duration-300 ${
                            selectedUser?.id
                            ? 'bg-neutral-900 border-white/5 text-neutral-400 group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 group-hover:scale-105'
                            : 'bg-neutral-700 border-neutral-600 text-neutral-300 group-hover:bg-neutral-600'
                        }`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {selectedUser?.id ? 'Cambiar Perfil' : 'Seleccionar'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 mx-2" />

                {/* Category, Mode & Gender Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Categoría</span>
                        <Select
                            selected={formData?.category}
                            placeholder='Seleccionar'
                            items={[
                                { id: 'DUAL_SPORT', label: 'Doble propósito', title: 'Doble propósito' },
                                { id: 'DIRT', label: 'Terracería', title: 'Terracería' },
                                { id: 'STREET', label: 'Carretera', title: 'Carretera' },
                                { id: 'SPORT', label: 'Sport', title: 'Sport' },
                            ]}
                            className="bg-neutral-800 border-neutral-800 rounded-2xl"
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
                            className="bg-neutral-800 border-neutral-800 rounded-2xl"
                            onChange={(e) => {
                                saveFormData('mode', e.id);
                                saveFormData('is_couple', e.id === 'Pareja');
                                saveFormData('is_team', e.id === 'Equipo');
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Género</span>
                        <Select
                            selected={formData?.gender}
                            placeholder='Seleccionar'
                            items={GENDERS.map(g => ({ id: g.id, label: g.title, title: g.title }))}
                            className="bg-neutral-800 border-neutral-800 rounded-2xl"
                            onChange={(e) => saveFormData('gender', e.id)}
                        />
                    </div>
                </div>

                {formData?.is_couple && (
                    <div className="p-8 rounded-[2rem] bg-neutral-800 border border-neutral-800 space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-500 flex items-center">
                            <span className="w-1 h-3 bg-yellow-500 rounded-full mr-3"></span>
                            DATOS DE LA PAREJA
                        </h3>
                        
                        <div className="flex space-x-4 p-1 bg-neutral-900 rounded-2xl border border-neutral-700/50">
                            <button
                                type="button"
                                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                                    coupleCreationMode === 'merge'
                                        ? 'bg-yellow-500 text-black shadow-md'
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                                onClick={() => setCoupleCreationMode('merge')}
                            >
                                Fusionar con participante existente
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                                    coupleCreationMode === 'manual'
                                        ? 'bg-yellow-500 text-black shadow-md'
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                                onClick={() => setCoupleCreationMode('manual')}
                            >
                                Registrar datos manualmente
                            </button>
                        </div>

                        {coupleCreationMode === 'merge' ? (
                            <div className="space-y-3">
                                <TextInput
                                    label={'Número de participante o Email de la pareja'}
                                    value={coupleSearchQuery}
                                    onChange={(val) => setCoupleSearchQuery(val)}
                                    placeholder="Ej: 25 o correo@ejemplo.com"
                                />
                                {foundCouple ? (
                                    <div className="flex items-center space-x-2 text-xs text-green-500 font-bold bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                                        <span>✓ Pareja encontrada:</span>
                                        <span className="text-white">{foundCouple.full_name || foundCouple.profile?.name}</span>
                                        <span className="text-neutral-400">({foundCouple.profile?.email || foundCouple.stripe_webhook_email_notification})</span>
                                        <span className="bg-neutral-900 text-yellow-500 px-2 py-0.5 rounded font-mono text-[10px]">#{foundCouple.participant_number}</span>
                                    </div>
                                ) : coupleSearchQuery ? (
                                    <div className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                        ✗ No se encontró ningún participante activo con ese dorsal o correo en esta ruta.
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <TextInput
                                    label={'Nombre Completo'}
                                    value={coupleData.full_name}
                                    onChange={(val) => saveCoupleFormData('full_name', val)}
                                    placeholder="Nombre de la pareja"
                                />
                                <TextInput
                                    label={'Email'}
                                    value={coupleData.email}
                                    onChange={(val) => saveCoupleFormData('email', val)}
                                    placeholder="correo@ejemplo.com"
                                />
                                <TextInput
                                    label={'Teléfono'}
                                    value={coupleData.phone}
                                    onChange={(val) => saveCoupleFormData('phone', val)}
                                    placeholder="Ej: 811XXXXXXX"
                                />
                                <TextInput
                                    label={'Nombre en Jersey'}
                                    value={coupleData.name_on_jersey}
                                    onChange={(val) => saveCoupleFormData('name_on_jersey', val)}
                                    placeholder="Ej: NOMBRE PAREJA"
                                />
                                <TextInput
                                    label={'Talla de Jersey'}
                                    value={coupleData.jersey_size}
                                    onChange={(val) => saveCoupleFormData('jersey_size', val)}
                                    placeholder="Ej: M"
                                />
                                <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 ml-1">Género</span>
                                    <Select
                                        selected={coupleData.gender}
                                        placeholder='Seleccionar'
                                        items={GENDERS.map(g => ({ id: g.id, label: g.title, title: g.title }))}
                                        className="bg-neutral-900 border-neutral-800 rounded-2xl"
                                        onChange={(e) => saveCoupleFormData('gender', e.id)}
                                    />
                                </div>
                                <TextInput
                                    label={'Ciudad de Origen'}
                                    value={coupleData.city}
                                    onChange={(val) => saveCoupleFormData('city', val)}
                                    placeholder="Ej: MONTERREY"
                                />
                                <TextInput
                                    label={'Fecha de Nacimiento'}
                                    type='date'
                                    value={coupleData.birthday}
                                    onChange={(val) => saveCoupleFormData('birthday', val)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Personal & Jersey Details */}
                <div className="p-8 rounded-[2rem] bg-neutral-800 border border-neutral-800">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-500 mb-6 flex items-center">
                        <span className="w-1 h-3 bg-yellow-500 rounded-full mr-3"></span>
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
                <div className="p-8 rounded-[2rem] bg-neutral-800 border border-neutral-800">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500 mb-6 flex items-center">
                        <span className="w-1 h-3 bg-red-500 rounded-full mr-3"></span>
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
                    <div className="md:col-span-3 p-6 rounded-[2rem] bg-neutral-800 border border-neutral-800 flex items-center space-x-5">
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-700 bg-neutral-900 flex items-center justify-center">
                                {formData?.avatar_url ? (
                                    <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <span className="text-neutral-600 text-[10px] font-bold">FOTO</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 block mb-2">Fotografía</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-[10px] text-neutral-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 transition-all cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 p-6 rounded-[2rem] bg-yellow-500/5 border border-yellow-500 flex flex-col justify-center">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <input 
                                type='checkbox' 
                                className="mt-1 form-checkbox h-5 w-5 text-yellow-500 rounded-lg border-neutral-800 bg-neutral-900 focus:ring-0 transition-all" 
                                checked={termsAgreed} 
                                onChange={() => setTermsAgreed(!termsAgreed)} 
                            />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-neutral-300 group-hover:text-yellow-500 transition-colors uppercase tracking-widest">Acepto el Reglamento</span>
                                <span className="text-[9px] text-neutral-500 leading-tight mt-1">Confirmo que el piloto acepta los términos y condiciones.</span>
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