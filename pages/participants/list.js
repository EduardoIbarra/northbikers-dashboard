import {memo} from "react";
import Spinner from "../../components/spinner";

const ParticipantsList = ({isLoading, data}) => {

    const TableItem = memo(({profile: {name, email}, participant_number, category, route: {title}}) => {
        return (
            <tr>
                <td>{name}</td>
                <td>{email}</td>
                <td>{participant_number}</td>
                <td>{title}</td>
                <td>{category}</td>
            </tr>
        )
    })


    const fields = [
        {name: 'Participante'},
        {name: 'Email'},
        {name: 'Número'},
        {name: 'Ruta'},
        {name: 'Categoria'},
    ]

    return (
        <div className='w-3/5   overflow-auto'>
            {isLoading && <Spinner size={50}/>}
            {!isLoading && data?.length ? (
                <table className="table no-border striped">
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
            ): null}

            {!data?.length && !isLoading && (
                <div className="mt-10 p-10 text-center">
                    <h6>No se encontraron usuarios registrados en esta ruta</h6>
                </div>
            )}
        </div>
    )
}

export default ParticipantsList
