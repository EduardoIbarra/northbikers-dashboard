'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RewardLayout from './_layout';

function normalizeFileName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function RewardArticlesManagePage() {
    const supabase = getSupabase();
    const [rewards, setRewards] = useState([]);
    const [newReward, setNewReward] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 10;

    const fields = [
        'name',
        'description',
        'part_number',
        'minimum_routes',
        'minimum_points',
        'valid_until',
        'is_valid',
        'mxn_value',
        'stock',
    ];

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        const { data, error } = await supabase
            .from('reward_articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) toast.error('Error al cargar artículos');
        else setRewards(data);
    };

    const handleChange = (id, field, value) => {
        setRewards((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleUpdate = async (id) => {
        const reward = rewards.find((r) => r.id === id);
        const { error } = await supabase.from('reward_articles').update(reward).eq('id', id);

        if (error) toast.error('Error al actualizar');
        else {
            toast.success('Artículo actualizado');
            setEditingId(null);
        }
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('reward_articles').delete().eq('id', id);
        if (error) toast.error('Error al eliminar');
        else {
            toast.success('Artículo eliminado');
            fetchRewards();
        }
    };

    const handleAdd = async () => {
        const { error } = await supabase.from('reward_articles').insert(newReward);
        if (error) toast.error('Error al agregar');
        else {
            toast.success('Artículo agregado');
            setNewReward({});
            fetchRewards();
        }
    };

    const handleImageUpload = async (e, rewardId) => {
        const file = e.target.files[0];
        if (!file) return;

        const safeName = normalizeFileName(file.name);
        const filePath = `reward_articles/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase
            .storage
            .from('pictures')
            .upload(filePath, file);

        if (uploadError) {
            toast.error('❌ Error al subir imagen: ' + uploadError.message);
            return;
        }

        // ✅ Store ONLY the relative path
        const { error: updateError } = await supabase
            .from('reward_articles')
            .update({ picture: filePath }) // store just path
            .eq('id', rewardId);

        if (updateError) {
            toast.error('❌ Error al guardar ruta de imagen: ' + updateError.message);
        } else {
            toast.success('✅ Imagen actualizada');
            fetchRewards(); // Refresh list
        }
    };

    const filteredRewards = rewards.filter((r) =>
        r.name?.toLowerCase().includes(search.toLowerCase())
    );

    const paginatedRewards = filteredRewards.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(filteredRewards.length / pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto text-sm">
            <ToastContainer />
            <h1 className="text-2xl font-bold mb-4">Gestión de Artículos</h1>

            <div className="mb-4 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    className="border rounded px-3 py-1 text-sm w-64"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                    }}
                />
            </div>

            <table className="w-full border text-sm bg-white shadow rounded">
                <thead className="bg-gray-100">
                    <tr>
                        {fields.map((f) => (
                            <th key={f} className="text-left px-2 py-2 capitalize border-b">{f.replace(/_/g, ' ')}</th>
                        ))}
                        <th className="px-2 py-2 border-b">Acciones</th>
                    </tr>
                    <tr>
                        {fields.map((field) => (
                            <td key={field} className="px-2 py-1">
                                <input
                                    placeholder={field}
                                    value={newReward[field] || ''}
                                    onChange={(e) => setNewReward({ ...newReward, [field]: e.target.value })}
                                    className="border rounded px-2 py-1 w-full"
                                />
                            </td>
                        ))}
                        <td>
                            <button
                                className="bg-green-600 text-white py-1 px-2 rounded"
                                onClick={handleAdd}
                            >
                                Agregar
                            </button>
                        </td>
                    </tr>
                </thead>
                <tbody>
                    {paginatedRewards.map((r) => (
                        <tr key={r.id} className="border-t">
                            {editingId === r.id ? (
                                <>
                                    {fields.map((field) => (
                                        <td key={field} className="px-2 py-1">
                                            <input
                                                value={r[field] ?? ''}
                                                onChange={(e) => handleChange(r.id, field, e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        </td>
                                    ))}
                                    <td className="px-2 py-1 space-x-2">
                                        <button
                                            className="bg-blue-600 text-white py-1 px-2 rounded"
                                            onClick={() => handleUpdate(r.id)}
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            className="bg-red-600 text-white py-1 px-2 rounded"
                                            onClick={() => handleDelete(r.id)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    {fields.map((field) => (
                                        <td key={field} className="px-2 py-1">{String(r[field] ?? '')}</td>
                                    ))}
                                    <td className="px-2 py-1">
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="bg-yellow-600 text-white py-1 px-2 rounded"
                                                    onClick={() => setEditingId(r.id)}
                                                >
                                                    Editar
                                                </button>
                                                <label className="text-xs text-gray-700">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleImageUpload(e, r.id)}
                                                        className="hidden"
                                                    />
                                                    <span className="bg-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-gray-300">
                                                        📷
                                                    </span>
                                                </label>
                                            </div>
                                            {r.picture && (
                                                <img
                                                    src={`https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/${r.picture}`}
                                                    alt="preview"
                                                    className="mt-1 w-20 h-20 object-cover rounded border"
                                                />
                                            )}
                                        </div>
                                    </td>

                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mt-4 space-x-2">
                <button
                    className="px-2 py-1 border rounded"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                >
                    Anterior
                </button>
                <span className="px-2 py-1">
                    Página {page + 1} de {totalPages}
                </span>
                <button
                    className="px-2 py-1 border rounded"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}

RewardArticlesManagePage.getLayout = (page) => <RewardLayout>{page}</RewardLayout>;
export default RewardArticlesManagePage;
