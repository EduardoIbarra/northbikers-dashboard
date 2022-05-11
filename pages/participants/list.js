import {memo, useCallback, useState} from "react";
import Spinner from "../../components/spinner";
import CheckInsModal from "../../components/modals/check-ins";
import {CATEGORIES, GENDERS} from "../../utils";
import Button from "../../components/button";
import {AiFillEdit} from "react-icons/ai";

const ParticipantsList = ({isLoading, data, onReload, isFiltered, onEdit}) => {
    const [selectedUser, setSelectedUser] = useState(null);

    const getSelectValue = useCallback((value, dict) => {
        return dict.find(({id}) => value?.toLocaleLowerCase() === id?.toLocaleLowerCase())?.title ?? 'Sin definir'
    }, [])

    const TableItem = memo((row) => {
        const {profile, participant_number, position, category, points, route: {title}, gender} = row;
        const {name, email} = profile;
        return (
            <tr onClick={() => setSelectedUser(profile)} className='cursor-pointer hover:bg-gray-100 rounded'>
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
                <td>{position}</td>
                <td>{points ?? 0}</td>
                <td>{participant_number}</td>
                <td>{name}</td>
                <td>{getSelectValue(category, CATEGORIES)}</td>
                <td>{email}</td>
                <td>{title}</td>
                <td>{getSelectValue(gender, GENDERS)}</td>
            </tr>
        )
    })

    const fields = [
        {name: 'Editar'},
        {name: 'Posición'},
        {name: 'Puntos'},
        {name: 'Número'},
        {name: 'Participante'},
        {name: 'Categoría'},
        {name: 'Email'},
        {name: 'Ruta'},
        {name: 'Género'},
    ]

    const handleToggleModal = (shouldUpdateListOnDismiss) => {
        setSelectedUser(null)
        if (shouldUpdateListOnDismiss) onReload()
    }

    console.log({data})
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
                </div>
            )}

            <CheckInsModal isOpen={!!selectedUser} profile={selectedUser} onClose={handleToggleModal}/>
        </div>
    )
}

export default ParticipantsList
