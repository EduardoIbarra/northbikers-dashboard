import Modal from "../modal";
import TextInput from "../../input";
import Select from "../../select";
import {getSupabase} from "../../../utils/supabase";
import {useCallback, useEffect, useState} from "react";
import Button from "../../button";

const SearchUserModal = ({isOpen, onClose, onSelect}) => {
    const supabase = getSupabase();
    const [users, setUsers] = useState(null);
    const [query, setQuery] = useState(null);
    const [isLoading, setLoading] = useState(false);

    const getResults = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    event_profile!left(*)
                `)
                .ilike('email', `%${query}%`)
                .order('created_at', { foreignTable: 'event_profile', ascending: false })
                .limit(1);
    
            if (error) throw error;
            
            setUsers(data ?? []);
        } catch (e) {
            console.log("Error", e);
            setUsers([]);
        }
    
        setLoading(false);
    }, [query]);    


    const Item = (user) => {
        const {id, name, email, event_profile} = user;
        const latestEventProfile = event_profile?.find(p => p.name_on_jersey) ?? event_profile?.[0];
        user.latestEventProfile = latestEventProfile;

        return (
            <div className='mt-1 p-1 rounded hover:bg-gray-100 cursor-pointer' key={id} onClick={() => {
                onSelect(user)
            }}>
                <p>{name}, {email}</p>
            </div>
        )
    }

    useEffect(() => {
        if (!isOpen) setUsers(null)
    }, [isOpen])

    useEffect(() => {
        if (query) getResults()

        if (!query) {
            setUsers(null)
        }
    }, [query])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isLoading ? 'Buscando...' : 'Buscar perfil'}
            subtitle='Ingresa el correo electrónico del perfil'
            okClearButton
            okButton={isLoading ? null : {
                onClick: onClose,
                label: 'Cerrar',
            }}
        >
            <div>
                <TextInput placeholder='Email' onChange={setQuery} value={query}/>
                {users?.length && users !== null ? (
                    <>
                        <p>Resultados</p>
                        <div className='overflow-auto max-h-60 h-auto'>
                            {users.map((u) => {
                                return (
                                    Item({...u})
                                )
                            })}
                        </div>
                    </>
                ) : null}

                {(users !== null && !users?.length && query) && <h5>Usuario no encontrado</h5>}
            </div>
        </Modal>
    )
}

export default SearchUserModal
