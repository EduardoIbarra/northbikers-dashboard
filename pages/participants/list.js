import {memo, useCallback, useState, useEffect} from "react";
import Spinner from "../../components/spinner";
import CheckInsModal from "../../components/modals/check-ins";
import {CATEGORIES, GENDERS} from "../../utils";
import Button from "../../components/button";
import {AiFillEdit} from "react-icons/ai";
import {getSupabase} from "../../utils/supabase";
import { Result } from "postcss";

const ParticipantsList = ({isLoading, data, onReload, isFiltered, onEdit, isPrivateView = true}) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const supabase2 = getSupabase();

    const getSelectValue = useCallback((value, dict) => {
        return dict.find(({id}) => value?.toLocaleLowerCase() === id?.toLocaleLowerCase())?.title ?? 'Sin definir'
    }, [])

    const TableItem = memo((row) => {
        const {profile, participant_number, position, category, points, route: {title}, gender} = row;
        const [checkins, setCheckins] = useState(null);
        const [challenges, setChallenges] = useState(null);
        const {name, email} = profile;
        
        const getCheckins = useCallback(async (row) => {
            try {
                let res = await supabase2.from("check_ins").select
                (`*,
                checkpoints!inner(*)`)
                .eq('route_id', row.route_id)
                .eq('profile_id', row.profile_id)
                .not('checkpoints.icon','like','%challenges.png')
                setCheckins(res.data.length);
                //return res.count();
            } catch (e) {
                console.log("Error", e);
            }
        },[])

        const getChallenges = useCallback(async (row) => {
            try {
                let res = await supabase2.from("check_ins").select
                (`*,
                checkpoints!inner(*)`)
                .eq('route_id', row.route_id)
                .eq('profile_id', row.profile_id)
                .like('checkpoints.icon','%challenges.png')
                setChallenges(res.data.length);
                //return res.count();
            } catch (e) {
                console.log("Error", e);
            }
        },[])
    
        useEffect(() => {
            getCheckins(row)
            getChallenges(row)
              // make sure to catch any error
              .catch(console.error);;
          }, [getCheckins])

        return (
            <tr onClick={() => {
                if (isPrivateView) setSelectedUser(profile)
            }} className='cursor-pointer hover:bg-gray-100 rounded'>
                {isPrivateView ? (
                    <td>
                        <Button
                            className=""
                            onClick={(e) => {
                                onEdit(row)
                                e.stopPropagation();
                                e.preventDefault();
                            }}><AiFillEdit/>
                        </Button>
                    </td>
                ) : null}
                <td>{position}</td>
                <td>{points ?? 0}</td>
                <td>{participant_number}</td>
                <td>{name}</td>
                <td>{getSelectValue(category, CATEGORIES)}</td>
                <td>{email}</td>
                <td>{title}</td>
                <td>{getSelectValue(gender, GENDERS)}</td>
                <td>{checkins}</td>
                <td>{challenges}</td>
            </tr>
        )
    })

    const fields = [
        ...(isPrivateView ? [{name: 'Editar'}] : []),
        {name: 'Posición'},
        {name: 'Puntos'},
        {name: 'Número'},
        {name: 'Participante'},
        {name: 'Categoría'},
        {name: 'Email'},
        {name: 'Ruta'},
        {name: 'Género'},
        {name: '# Checkins'},
        {name: '# Retos'}
    ]

    const handleToggleModal = (shouldUpdateListOnDismiss) => {
        setSelectedUser(null)
        if (shouldUpdateListOnDismiss) onReload()
    }

    return (
        <div className='w-3/5   overflow-auto'>
            {isLoading && <Spinner size={50}/>}
            {!isLoading && data?.length ? (
                <table className="table no-border">
                    <thead>
                    <tr>
                        {fields.map(({name}) => (
                            <th key={name}>{name}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((u) => {
                        return <TableItem key={u.id} {...u}/>
                    })}
                    </tbody>
                </table>
            ) : null}

            {!data?.length && !isLoading && (
                <div className="mt-10 p-10 text-center">
                    <h6>{isFiltered ? 'No se han encontrado resultados con la búsqueda' : 'No se encontraron usuarios registrados en esta ruta'}</h6>
                    <p>{isFiltered ? 'Ajusta tu búsqueda e intenta de nuevo' : ''}</p>
                </div>
            )}

            <CheckInsModal isOpen={!!selectedUser} profile={selectedUser} onClose={handleToggleModal}/>
        </div>
    )
}

export default ParticipantsList
