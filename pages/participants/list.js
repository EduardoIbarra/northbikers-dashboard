import { memo, useCallback, useState, useEffect } from "react";
import Spinner from "../../components/spinner";
import CheckInsModal from "../../components/modals/check-ins";
import { CATEGORIES, GENDERS } from "../../utils";
import Button from "../../components/button";
import { AiFillEdit } from "react-icons/ai";
import { getSupabase } from "../../utils/supabase";

const ParticipantsList = ({ isLoading, initialData, onReload, isFiltered, onEdit, isPrivateView = true }) => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [data, setData] = useState([]);
    const supabase2 = getSupabase();

    useEffect(() => {
        setData(initialData);
        console.log("Initial Data set in ParticipantsList:", initialData);
    }, [initialData]);

    const getSelectValue = useCallback((value, dict) => {
        return dict.find(({ id }) => value?.toLocaleLowerCase() === id?.toLocaleLowerCase())?.title ?? 'Sin definir';
    }, []);

    const downloadCSV = () => {
        const csvString = convertToCSV(data, getSelectValue);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "participants_list.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const convertToCSV = (data, getSelectValue) => {
        const headers = [
            "Posición", "Puntos", "Número", "Participante", "Categoría",
            "Email", "Género", "# Checkins", "# Retos", "Ruta", "Pago"
        ].join(',');

        const rows = data.map(row => [
            row.position,
            row.points ?? 0,
            row.participant_number,
            row.profile.name,
            getSelectValue(row.category, CATEGORIES),
            row.profile.email,
            getSelectValue(row.gender, GENDERS),
            row.regular_checkins_number ?? 0,
            row.challenge_checkins_number ?? 0,
            row.route.title,
            row.payment_status === 'paid' ? 'Paid' : 'Not Paid'
        ].join(','));

        return [headers, ...rows].join('\n');
    };

    const TableItem = memo((row) => {
        const { profile, participant_number, position, category, points, route: { title }, gender, payment_status, regular_checkins_number, challenge_checkins_number, avatar_url } = row;
        const { name, email } = profile;
    
        return (
            <tr onClick={() => {
                if (isPrivateView) setSelectedUser(profile);
            }} className='cursor-pointer hover:bg-gray-100 rounded'>
                {isPrivateView ? (
                    <td>
                        <Button
                            className=""
                            onClick={(e) => {
                                onEdit(row);
                                e.stopPropagation();
                                e.preventDefault();
                            }}><AiFillEdit />
                        </Button>
                    </td>
                ) : null}
                <td>{position}</td>
                <td>{points ?? 0}</td>
                <td>{participant_number}</td>
                <td>{name}</td>
                <td>{getSelectValue(category, CATEGORIES)}</td>
                <td>{email}</td>
                <td>{getSelectValue(gender, GENDERS)}</td>
                <td>{regular_checkins_number}</td>
                <td>{challenge_checkins_number}</td>
                <td>{title}</td>
                <td>
                    {payment_status === 'paid' ? (
                        <div style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: 'green',
                            display: 'inline-block'
                        }}></div>
                    ) : (
                        <div style={{
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: 'red',
                            display: 'inline-block'
                        }}></div>
                    )}
                </td>
                <td>
                <td>
                {avatar_url && (
                    <a
                        href={avatar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            e.preventDefault(); // Prevent default link behavior
                            window.open(avatar_url, "_blank"); // Open the avatar in a new tab
                        }}
                        title="View Avatar"
                    >
                        Abrir Foto
                    </a>
                )}
            </td>
                </td>
            </tr>
        );
    });    

    const fields = [
        ...(isPrivateView ? [{ name: 'Editar' }] : []),
        { name: 'Posición' },
        { name: 'Puntos' },
        { name: 'Número' },
        { name: 'Participante' },
        { name: 'Categoría' },
        { name: 'Email' },
        { name: 'Género' },
        { name: '# Checkins' },
        { name: '# Retos' },
        { name: 'Ruta' },
        { name: 'Pago' },
        { name: 'Avatar' },
    ];

    const handleToggleModal = (shouldUpdateListOnDismiss) => {
        setSelectedUser(null);
        if (shouldUpdateListOnDismiss) onReload();
    };

    return (
        <div className='overflow-auto'>
            {isLoading && <Spinner size={50} />}
            {!isLoading && data?.length ? (
                <>
                    <Button onClick={downloadCSV} className="download-csv-button">
                        Descargar en Excel
                    </Button>
                    <table className="table no-border">
                        <thead>
                            <tr>
                                {fields.map(({ name }) => (
                                    <th key={name}>{name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((u) => {
                                return <TableItem key={u.id} {...u} />;
                            })}
                        </tbody>
                    </table>
                </>
            ) : null}

            {!data?.length && !isLoading && (
                <div className="mt-10 p-10 text-center">
                    <h6>{isFiltered ? 'No se han encontrado resultados con la búsqueda' : 'No se encontraron usuarios registrados en esta ruta'}</h6>
                    <p>{isFiltered ? 'Ajusta tu búsqueda e intenta de nuevo' : ''}</p>
                </div>
            )}

            <CheckInsModal isOpen={!!selectedUser} profile={selectedUser} onClose={handleToggleModal} />
        </div>
    );
};

export default ParticipantsList;
