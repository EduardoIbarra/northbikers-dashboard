'use client';
import { useEffect, useState, useRef } from 'react';
import { getSupabase } from '../../utils/supabase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RewardLayout from './_layout';

// Icon Components
const PlusIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
);

const EditIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const TrashIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CameraIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SearchIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

function normalizeFileName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function RewardArticlesManagePage() {
    const supabase = getSupabase();
    const [rewards, setRewards] = useState([]);
    const [newReward, setNewReward] = useState({
        name: '',
        description: '',
        points: 0,
        restrictions: '',
        max_percent_discount: 0,
        reset_on_change: true
    });
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const fileInputRefs = useRef({});

    const fields = [
        { key: 'name', label: 'Nombre', type: 'text' },
        { key: 'description', label: 'Descripción', type: 'textarea' },
        { key: 'points', label: 'Meta (pts)', type: 'number' },
        { key: 'max_percent_discount', label: 'Desc. Máx %', type: 'number' },
        { key: 'restrictions', label: 'Restricciones', type: 'textarea' },
        { key: 'reset_on_change', label: 'Reiniciar puntos', type: 'boolean' },
    ];

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) toast.error('Error al cargar recompensas');
        else setRewards(data);
        setLoading(false);
    };

    const handleChange = (id, field, value) => {
        setRewards((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleUpdate = async (id) => {
        setActionLoading(id);
        const reward = rewards.find((r) => r.id === id);
        const { error } = await supabase.from('rewards').update(reward).eq('id', id);

        if (error) toast.error('Error al actualizar');
        else {
            toast.success('Recompensa actualizada');
            setEditingId(null);
        }
        setActionLoading(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
        setActionLoading(id);
        const { error } = await supabase.from('rewards').delete().eq('id', id);
        if (error) toast.error('Error al eliminar');
        else {
            toast.success('Recompensa eliminada');
            fetchRewards();
        }
        setActionLoading(null);
    };

    const handleAdd = async () => {
        setActionLoading('adding');
        const { error } = await supabase.from('rewards').insert(newReward);
        if (error) toast.error('Error al agregar');
        else {
            toast.success('Recompensa agregada');
            setNewReward({
                name: '',
                description: '',
                points: 0,
                restrictions: '',
                max_percent_discount: 0,
                reset_on_change: true
            });
            setIsAdding(false);
            fetchRewards();
        }
        setActionLoading(null);
    };

    const handleImageUpload = async (e, rewardId) => {
        const file = e.target.files[0];
        if (!file) return;

        setActionLoading(rewardId);
        const safeName = normalizeFileName(file.name);
        const filePath = `rewards/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase
            .storage
            .from('pictures')
            .upload(filePath, file);

        if (uploadError) {
            toast.error('Error al subir imagen: ' + uploadError.message);
            setActionLoading(null);
            return;
        }

        const { error: updateError } = await supabase
            .from('rewards')
            .update({ picture: filePath })
            .eq('id', rewardId);

        if (updateError) {
            toast.error('Error al guardar ruta de imagen: ' + updateError.message);
        } else {
            toast.success('Imagen actualizada');
            fetchRewards();
        }
        setActionLoading(null);
    };

    const filteredRewards = rewards.filter((r) =>
        r.name?.toLowerCase().includes(search.toLowerCase())
    );

    const SkeletonCard = () => (
        <div className="bg-zinc-900 bg-opacity-40 backdrop-blur-md border border-white border-opacity-5 rounded-5xl p-10 h-80 animate-pulse">
            <div className="flex gap-8">
                <div className="w-32 h-32 bg-zinc-800 rounded-4xl" />
                <div className="flex-1 space-y-4">
                    <div className="h-5 w-1/2 bg-zinc-800 rounded-full" />
                    <div className="h-3 w-3/4 bg-zinc-800 rounded-full" />
                    <div className="h-3 w-2/3 bg-zinc-800 rounded-full" />
                </div>
            </div>
            <div className="mt-10 h-14 w-full bg-zinc-800 rounded-3xl" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-16 pb-32 pt-10">
            <ToastContainer theme="dark" position="bottom-right" />
            
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 relative">
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 bg-opacity-10 blur-[100px] rounded-full -mt-20 pointer-events-none" />
                <div className="space-y-6 relative z-10">
                    <div className="inline-flex items-center px-4 py-1.5 bg-indigo-500 bg-opacity-5 border border-indigo-500 border-opacity-10 rounded-full backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Inventory System</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic uppercase">
                        Administrar <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">Premios</span>
                    </h1>
                    <p className="text-zinc-500 text-base max-w-lg font-medium">Gestiona el catálogo de experiencias y recompensas para la comunidad NorthBikers.</p>
                </div>
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                            <SearchIcon className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar premio..."
                            className="bg-zinc-900 bg-opacity-60 border border-white border-opacity-5 rounded-3xl pl-14 pr-6 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-30 transition-all w-72 backdrop-blur-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className={`inline-flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-2xl ${
                            isAdding ? 'bg-zinc-800 text-zinc-500 border border-white border-opacity-5' : 'bg-white text-black hover:bg-indigo-600 hover:text-white shadow-white bg-opacity-5 shadow-xl active:scale-95'
                        }`}
                    >
                        {isAdding ? 'Cerrar Panel' : (
                            <>
                                <PlusIcon className="w-4 h-4" />
                                Nuevo Artículo
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Formulario Agregar con Liquid Glass */}
            {isAdding && (
                <div className="bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-10 rounded-5xl p-12 space-y-12 animate-in fade-in slide-in-from-top-10 duration-700 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500 bg-opacity-10 blur-[100px] -mr-48 -mt-48 rounded-full pointer-events-none" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
                        {fields.map((f) => (
                            <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-3 ml-1 italic">{f.label}</label>
                                {f.type === 'textarea' ? (
                                    <textarea
                                        value={newReward[f.key] || ''}
                                        onChange={(e) => setNewReward({ ...newReward, [f.key]: e.target.value })}
                                        className="w-full bg-black bg-opacity-60 border border-white border-opacity-5 rounded-3xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-all h-32 backdrop-blur-sm"
                                    />
                                ) : f.type === 'boolean' ? (
                                    <div className="flex items-center h-14 bg-black bg-opacity-60 border border-white border-opacity-5 rounded-3xl px-6">
                                        <button
                                            onClick={() => setNewReward({ ...newReward, [f.key]: !newReward[f.key] })}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 focus:outline-none ${newReward[f.key] ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-500 ${newReward[f.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="ml-4 text-zinc-400 text-xs font-black uppercase tracking-widest">{newReward[f.key] ? 'Activado' : 'Desactivado'}</span>
                                    </div>
                                ) : (
                                    <input
                                        type={f.type}
                                        value={newReward[f.key] || ''}
                                        onChange={(e) => setNewReward({ ...newReward, [f.key]: e.target.value })}
                                        className="w-full bg-black bg-opacity-60 border border-white border-opacity-5 rounded-3xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-all backdrop-blur-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end relative z-10 border-t border-white border-opacity-5 pt-10">
                        <button
                            onClick={handleAdd}
                            disabled={actionLoading === 'adding' || !newReward.name}
                            className="bg-white text-black hover:bg-indigo-600 hover:text-white disabled:opacity-50 font-black uppercase tracking-[0.3em] text-xs py-5 px-12 rounded-3xl transition-all duration-500 shadow-2xl active:scale-95 border-b-4 border-zinc-200 hover:border-indigo-400"
                        >
                            {actionLoading === 'adding' ? 'Saving...' : 'Confirmar Registro'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : filteredRewards.length === 0 ? (
                <div className="text-center py-32 bg-zinc-900 bg-opacity-10 rounded-6xl border border-white border-opacity-5 border-dashed backdrop-blur-sm">
                    <p className="text-zinc-600 font-medium italic">No se han encontrado artículos en el inventario actual.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {filteredRewards.map((r) => {
                        const isEditing = editingId === r.id;
                        return (
                            <div key={r.id} className="bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-5xl p-10 flex flex-col group relative transition-all duration-700 hover:bg-zinc-900 hover:bg-opacity-60 shadow-2xl overflow-hidden">
                                {actionLoading === r.id && (
                                    <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-[4px] z-50 flex items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                                
                                <div className="flex gap-10 mb-10">
                                    <div className="relative group/img">
                                        <div className="w-32 h-32 rounded-4xl bg-black border border-white border-opacity-5 overflow-hidden shadow-2xl relative">
                                            {r.picture ? (
                                                <img
                                                    src={`https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/${r.picture}`}
                                                    alt={r.name}
                                                    className="w-full h-full object-cover transition duration-1000 group-hover/img:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                    <CameraIcon className="w-12 h-12" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black bg-opacity-20 to-transparent pointer-events-none" />
                                        </div>
                                        <label className="absolute -bottom-3 -right-3 w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white transition-all duration-500 shadow-2xl ring-8 ring-zinc-900 ring-opacity-40 group-hover/img:scale-110 active:scale-95 group-hover/img:translate-y-[-5px]">
                                            <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, r.id)} />
                                            <CameraIcon className="w-6 h-6" />
                                        </label>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {isEditing ? (
                                            <input
                                                value={r.name || ''}
                                                onChange={(e) => handleChange(r.id, 'name', e.target.value)}
                                                className="w-full px-4 py-2 bg-black bg-opacity-60 border border-white border-opacity-10 rounded-xl text-xl font-black text-white uppercase italic tracking-tighter outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-all"
                                            />
                                        ) : (
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic group-hover:text-indigo-400 transition-all duration-500 line-clamp-1">{r.name}</h3>
                                        )}
                                        
                                        {isEditing ? (
                                            <textarea
                                                value={r.description || ''}
                                                onChange={(e) => handleChange(r.id, 'description', e.target.value)}
                                                className="w-full px-4 py-2 bg-black bg-opacity-60 border border-white border-opacity-10 rounded-xl text-sm text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 transition-all h-24"
                                            />
                                        ) : (
                                            <p className="text-zinc-500 text-sm font-medium leading-relaxed line-clamp-2 italic">{r.description || 'Sin descripción'}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mt-auto">
                                    <div className="bg-black bg-opacity-40 p-6 rounded-4xl border border-white border-opacity-5 backdrop-blur-md relative overflow-hidden group/box">
                                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-2 italic">Target Scale</p>
                                        <div className="flex items-baseline gap-2 relative z-10">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={r.points || 0}
                                                    onChange={(e) => handleChange(r.id, 'points', e.target.value)}
                                                    className="w-full bg-black bg-opacity-40 border-none px-0 text-3xl font-black text-indigo-400 outline-none tabular-nums"
                                                />
                                            ) : (
                                                <span className="text-3xl font-black text-indigo-400 tabular-nums drop-shadow-lg">{r.points.toLocaleString()}</span>
                                            )}
                                            <span className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic group-hover/box:text-indigo-400 transition-colors">PTS</span>
                                        </div>
                                    </div>
                                    <div className="bg-black bg-opacity-40 p-6 rounded-4xl border border-white border-opacity-5 backdrop-blur-md relative overflow-hidden group/box">
                                        <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-2 italic">Max Percent</p>
                                        <div className="flex items-baseline gap-2 relative z-10">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={r.max_percent_discount || 0}
                                                    onChange={(e) => handleChange(r.id, 'max_percent_discount', e.target.value)}
                                                    className="w-full bg-black bg-opacity-40 border-none px-0 text-3xl font-black text-purple-400 outline-none tabular-nums"
                                                />
                                            ) : (
                                                <span className="text-3xl font-black text-purple-400 tabular-nums drop-shadow-lg">{r.max_percent_discount}%</span>
                                            )}
                                            <span className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic group-hover/box:text-purple-400 transition-colors">DESC</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex items-center justify-between gap-6 pt-8 border-t border-white border-opacity-5">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">Global Entry</span>
                                        <p className="text-[10px] text-zinc-500 font-bold italic">#{r.id}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdate(r.id)}
                                                    className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-indigo-600 hover:text-white transition-all duration-500 shadow-2xl active:scale-95"
                                                >
                                                    Safe Update
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-8 py-3 bg-zinc-800 text-zinc-500 font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-zinc-700 transition-all duration-500 active:scale-95"
                                                >
                                                    Discard
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditingId(r.id)}
                                                    className="w-12 h-12 rounded-2xl bg-white bg-opacity-5 border border-white border-opacity-5 text-zinc-600 flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 active:scale-90 transition-all duration-700"
                                                >
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(r.id)}
                                                    className="w-12 h-12 rounded-2xl bg-white bg-opacity-5 border border-white border-opacity-5 text-zinc-600 flex items-center justify-center hover:bg-red-600 hover:text-white hover:scale-110 active:scale-90 transition-all duration-700"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

RewardArticlesManagePage.getLayout = (page) => <RewardLayout>{page}</RewardLayout>;
export default RewardArticlesManagePage;
