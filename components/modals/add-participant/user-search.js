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
        setLoading(true)
        try {
            const {data} = await supabase.from('profiles')
                .select('*')
                .ilike('email', `%${query}%`)
            if (data) {
                setUsers(data)
            }
        } catch (e) {
            console.log("Error", e);
            setUsers([])
        }

        setLoading(false)
    }, [query])

    const handleSearch = () => {
        return getResults()
    }

    const Item = (user) => {
        const {id, name, email} = user;
        return (
            <div className='mt-1 p-1 rounded hover:bg-gray-100 cursor-pointer' key={id} onClick={() => {
                onSelect(user)
            }}>
                <p>{name}</p>
                <p className='text-gray-400 font-light'>{email}</p>
            </div>
        )
    }

    useEffect(() => {
        if (!isOpen) setUsers(null)
    }, [isOpen])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title='Buscar perfil'
            subtitle='Ingresa el correo electrónico del perfil'
            okClearButton
            okButton={{
                onClick: handleSearch,
                label: isLoading? 'Buscando...': 'Buscar',
            }}
        >
            <div>
                <TextInput placeholder='Email' onChange={setQuery} value={query}/>
                {users?.length && users !== null && (
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
                )}

                {(users !== null && !users?.length && query) && <h5>Usuario no encontrado</h5>}
            </div>
        </Modal>
    )
}

export default SearchUserModal
