import {memo, useState} from "react";
import Spinner from "../../components/spinner";
import CheckInsModal from "../../components/modals/check-ins";

const ParticipantsList = ({isLoading, data, onReload, isFiltered}) => {
    const [selectedUser, setSelectedUser] = useState(null);

    const TableItem = memo(({profile, participant_number,position,  category, points,  route: {title}, gender}) => {
        const  {name, email} = profile;
        return (
            <tr onClick={() => setSelectedUser(profile)} className='cursor-pointer hover:bg-gray-100 rounded'>
                <td>{position}</td>
                <td>{points ?? 0}</td>
                <td>{participant_number}</td>
                <td>{name}</td>
                <td>{category}</td>
                <td>{email}</td>
                <td>{title}</td>
                <td>{gender}</td>
            </tr>
        )
    })

    const fields = [
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
        if(shouldUpdateListOnDismiss) onReload()
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
                    <h6>{isFiltered ? 'No se han encontrado resultados con la búsqueda':'No se encontraron usuarios registrados en esta ruta'}</h6>
                </div>
            )}

            <CheckInsModal isOpen={!!selectedUser} profile={selectedUser} onClose={handleToggleModal}/>
        </div>
    )
}

export default ParticipantsList
