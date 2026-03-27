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
            <div className='mt-2 p-4 rounded-2xl hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all cursor-pointer group' key={id} onClick={() => {
                onSelect(user)
            }}>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors uppercase">{name}</span>
                    <span className="text-xs text-neutral-500 font-medium">{email}</span>
                </div>
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
            <div className="space-y-6">
                <TextInput 
                    placeholder='Email del perfil' 
                    onChange={setQuery} 
                    value={query}
                    className="bg-neutral-800 border-neutral-800 rounded-2xl"
                />
                {users?.length && users !== null ? (
                    <div className="space-y-4">
                        <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-yellow-500 ml-1">
                            Resultados encontrados
                        </div>
                        <div className='overflow-auto max-h-80 h-auto pr-2 custom-scrollbar'>
                            {users.map((u) => {
                                return (
                                    Item({...u})
                                )
                            })}
                        </div>
                    </div>
                ) : null}

                {(users !== null && !users?.length && query) && (
                    <div className="py-8 text-center bg-neutral-800 rounded-2xl border border-neutral-800 border-dashed">
                        <h5 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Usuario no encontrado</h5>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default SearchUserModal
