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
        const sorted = sortParticipants(initialData);
        setData(sorted);
        console.log("Initial Data set in ParticipantsList (sorted w/ tiebreaker):", sorted);
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

    const downloadParticipantJerseys = async () => {
        const { data: jerseyData, error } = await supabase2
            .from("event_profile")
            .select("participant_number, gender, name_on_jersey, full_name, jersey_size, phone, stripe_webhook_email_notification")
            .eq("route_id", data[0]?.route_id)
            .gt("participant_number", 0);

        if (error) return console.error("Error fetching participant jerseys:", error);

        const sorted = jerseyData.sort((a, b) => a.participant_number - b.participant_number);

        const headers = ["Número", "Género", "Nombre Jersey", "Nombre Completo", "Talla", "Teléfono", "Email"];
        const rows = sorted.map(j => [
            j.participant_number,
            j.gender,
            j.name_on_jersey,
            j.full_name,
            j.jersey_size,
            j.phone,
            j.stripe_webhook_email_notification
        ]);

        downloadCSVFile("jerseys_participantes.csv", headers, rows);
    };

    const downloadCoupleJerseys = async () => {
        const routeId = data[0]?.route_id;

        const { data: coupleData, error } = await supabase2
            .from("event_profile_couple")
            .select(`
            email,
            full_name,
            phone,
            name_on_jersey,
            jersey_size,
            gender,
            event_profile (
                participant_number,
                full_name,
                route_id
            )
        `);

        if (error) {
            console.error("Error fetching couple jerseys:", error);
            return;
        }

        const filtered = coupleData
            .filter(c => c.event_profile?.route_id === routeId && c.event_profile?.participant_number > 0)
            .sort((a, b) => a.event_profile.participant_number - b.event_profile.participant_number);

        // ✅ Deduplicate by participant_number
        const uniqueByParticipantNumber = new Map();
        filtered.forEach(c => {
            const num = c.event_profile.participant_number;
            if (!uniqueByParticipantNumber.has(num)) {
                uniqueByParticipantNumber.set(num, c);
            }
        });

        const uniqueFiltered = Array.from(uniqueByParticipantNumber.values());

        const headers = [
            "Número Participante", "Piloto", "Email", "Nombre Completo",
            "Teléfono", "Nombre Jersey", "Talla", "Género"
        ];

        const rows = uniqueFiltered.map(c => [
            c.event_profile.participant_number,
            c.event_profile.full_name,
            c.email,
            c.full_name,
            c.phone,
            c.name_on_jersey,
            c.jersey_size,
            c.gender
        ]);

        downloadCSVFile("jerseys_parejas.csv", headers, rows);
    };

    const downloadCSVFile = (filename, headers, rows) => {
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.click();
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
            `"${row.profile.name.replace(/"/g, '""')}"`,
            getSelectValue(row.category, CATEGORIES),
            row.profile.email,
            getSelectValue(row.gender, GENDERS),
            row.regular_checkins_number ?? 0,
            row.challenge_checkins_number ?? 0,
            `"${row.route.title.replace(/"/g, '""')}"`,
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
            }} className='group cursor-pointer hover:bg-neutral-800 border-b border-white/5 transition-all duration-200'>
                {isPrivateView ? (
                    <td className="py-4 px-4">
                        <button
                            className="p-3 transition-all hover:bg-yellow-500 hover:text-yellow-500 rounded-xl text-neutral-500"
                            onClick={(e) => {
                                onEdit(row);
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                        >
                            <AiFillEdit size={20} />
                        </button>
                    </td>
                ) : null}
                <td className="py-4 px-4 font-bold text-gray-400">#{position}</td>
                <td className="py-4 px-4">
                    <span className="text-xl font-black text-yellow-500">{points ?? 0}</span>
                </td>
                <td className="py-4 px-4">
                    <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono px-3 py-1 rounded-lg text-xs">
                        {participant_number}
                    </span>
                </td>
                <td className="py-4 px-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight">{name}</span>
                        <span className="text-xs text-neutral-500 font-medium">{email}</span>
                    </div>
                </td>
                <td className="py-4 px-4">
                    <span className="text-xs font-medium text-gray-400 lowercase italic">
                        {getSelectValue(category, CATEGORIES)}
                    </span>
                </td>
                <td className="py-4 px-4 text-xs text-gray-400">
                    {getSelectValue(gender, GENDERS)}
                </td>
                <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Checkins</span>
                            <span className="font-black text-neutral-200">{regular_checkins_number}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-neutral-800 mx-3"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Retos</span>
                            <span className="font-black text-yellow-500">{challenge_checkins_number}</span>
                        </div>
                    </div>
                </td>
                <td className="py-4 px-4">
                    <span className="text-[10px] px-3 py-1 bg-neutral-800 rounded-lg border border-neutral-800 text-neutral-400 uppercase font-bold tracking-widest truncate max-w-[120px] inline-block">
                        {title}
                    </span>
                </td>
                <td className="py-4 px-4">
                    <span className={payment_status === 'paid' ? 'status-paid' : 'status-unpaid'}>
                        {payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                </td>
                <td className="py-4 px-4">
                    {avatar_url ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(avatar_url, "_blank");
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:text-yellow-400 transition-colors"
                        >
                            Ver Foto
                        </button>
                    ) : (
                        <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">Sin Foto</span>
                    )}
                </td>
            </tr>
        );
    });

    const fields = [
        ...(isPrivateView ? [{ name: '' }] : []),
        { name: 'Pos' },
        { name: 'Pts' },
        { name: '#' },
        { name: 'Participante' },
        { name: 'Categoría' },
        { name: 'Género' },
        { name: 'Progreso' },
        { name: 'Ruta' },
        { name: 'Status' },
        { name: 'Foto' },
    ];

    const handleToggleModal = (shouldUpdateListOnDismiss) => {
        setSelectedUser(null);
        if (shouldUpdateListOnDismiss) onReload();
    };

    return (
        <div className='overflow-x-auto w-full'>
            {isLoading && (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Spinner size={50} />
                    <span className="text-gray-500 font-medium animate-pulse">Cargando participantes...</span>
                </div>
            )}
            {!isLoading && data?.length ? (
                <div className="flex flex-col">
                    <div className="flex flex-row items-center justify-between p-6 border-b border-white/5 bg-neutral-900 rounded-t-[2.5rem]">
                        <div className="flex space-x-3">
                            <Button
                                onClick={downloadCSV}
                                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                            >
                                CSV Maestro
                            </Button>
                            <Button
                                onClick={downloadParticipantJerseys}
                                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                            >
                                Jerseys Pilotos
                            </Button>
                            <Button
                                onClick={downloadCoupleJerseys}
                                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                            >
                                Jerseys Parejas
                            </Button>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                            Mostrando <span className="text-yellow-500">{data.length}</span> participantes
                        </div>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black text-neutral-500 uppercase text-[10px] font-black tracking-[0.25em]">
                                {fields.map(({ name }) => (
                                    <th key={name} className="py-5 px-4 border-b border-white/5">{name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((u) => {
                                return <TableItem key={u.id} {...u} />;
                            })}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {!data?.length && !isLoading && (
                <div className="flex flex-col items-center justify-center py-24 px-10 text-center bg-neutral-900 rounded-[2.5rem] border border-neutral-800">
                    <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mb-8 border border-neutral-700 shadow-xl">
                        <span className="text-5xl">🔍</span>
                    </div>
                    <h6 className="text-xl font-bold text-white mb-2">
                        {isFiltered ? 'Sin coincidencias' : 'Lista vacía'}
                    </h6>
                    <p className="text-neutral-500 max-w-xs">
                        {isFiltered
                            ? 'No encontramos participantes que coincidan con tus filtros. Intenta ajustar la búsqueda.'
                            : 'Aún no hay usuarios registrados en esta ruta.'}
                    </p>
                </div>
            )}

            <CheckInsModal isOpen={!!selectedUser} profile={selectedUser} onClose={handleToggleModal} />
        </div>
    );
};

const getLastCheckInMs = (row) => {
    // Try several possible shapes; missing dates go to the bottom of ties
    const candidates = [
        row?.last_check_in?.created_at,
        row?.lastCheckInCreatedAt,
        row?.last_checkin_created_at,
        Array.isArray(row?.check_ins) ? row.check_ins[row.check_ins.length - 1]?.created_at : undefined,
    ].filter(Boolean);

    if (!candidates.length) return Number.POSITIVE_INFINITY;

    const t = Date.parse(candidates[candidates.length - 1]); // use the latest in the array we built
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
};

const sortParticipants = (list) => {
    const arr = [...(list || [])];

    arr.sort((a, b) => {
        const pa = a?.points ?? 0;
        const pb = b?.points ?? 0;
        if (pb !== pa) return pb - pa; // higher points first

        const ta = getLastCheckInMs(a);
        const tb = getLastCheckInMs(b);
        if (ta !== tb) return ta - tb; // earlier last check-in first

        // Stable final tie-breakers (optional but recommended)
        const na = a?.participant_number ?? Number.POSITIVE_INFINITY;
        const nb = b?.participant_number ?? Number.POSITIVE_INFINITY;
        if (na !== nb) return na - nb;

        const an = a?.profile?.name ?? "";
        const bn = b?.profile?.name ?? "";
        return an.localeCompare(bn);
    });

    // Recompute positions to reflect new order
    return arr.map((item, idx) => ({ ...item, position: idx + 1 }));
};


export default ParticipantsList;
