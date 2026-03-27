import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSupabase } from '../../../utils/supabase';
import RewardLayout from './../_layout';

// Icon Components
const ArrowLeftIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const VerifiedIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const MapPinIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClockIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CloseIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

function RewardProfileDetail() {
    const router = useRouter();
    const { id } = router.query;
    const supabase = getSupabase();

    const [profile, setProfile] = useState(null);
    const [checkpoints, setCheckpoints] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const pageSize = 10;
    const totalPoints = checkpoints.reduce(
        (sum, c) => sum + (c.is_valid ? (c.checkpoints?.points || 0) : 0),
        0
    );

    useEffect(() => {
        if (!id) return;

        const fetchProfileDetail = async () => {
            setLoading(true);

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) {
                console.error('Error al cargar el perfil:', profileError);
                setLoading(false);
                return;
            }
            setProfile(profileData);

            const { data: checkpointData, error: checkpointError } = await supabase
                .from('check_ins')
                .select(`
                  id,
                  checkpoint_id,
                  route_id,
                  created_at,
                  lat,
                  lng,
                  distance,
                  original_lat,
                  original_lng,
                  original_distance,
                  picture,
                  is_valid,
                  checkpoints:checkpoint_id (
                    name,
                    points
                  ),
                  routes:route_id (
                    title,
                    is_euromotors,
                    start_timestamp
                  )
                `)
                .eq('profile_id', id)
                .order('created_at', { ascending: false });

            if (checkpointError) {
                console.error('Error al cargar checkpoints:', checkpointError);
            } else {
                const filtered = checkpointData.filter(c => 
                    c.routes?.is_euromotors && 
                    c.routes?.start_timestamp >= '2026-01-01'
                );
                setCheckpoints(filtered);
            }

            const { data: redemptionData, error: redemptionError } = await supabase
                .from('point_redemptions')
                .select('redeemed_at, points_redeemed, rewards(name)')
                .eq('user_id', id)
                .order('redeemed_at', { ascending: false });

            if (redemptionError) {
                console.error('Error al cargar redenciones:', redemptionError);
            } else {
                setRedemptions(redemptionData);
            }

            setLoading(false);
        };

        fetchProfileDetail();
    }, [id]);

    const currentPage = checkpoints.slice((page - 1) * pageSize, page * pageSize);

    const invalidateCheckIn = async (checkInId) => {
        const { error } = await supabase
            .from('check_ins')
            .update({ is_valid: false })
            .eq('id', checkInId);

        if (!error) {
            setCheckpoints((prev) =>
                prev.map((c) => (c.id === checkInId ? { ...c, is_valid: false } : c))
            );
            setSelectedCheckIn((prev) => (prev?.id === checkInId ? { ...prev, is_valid: false } : prev));
        }
    };

    const SkeletonRow = () => (
        <div className="h-16 w-full bg-zinc-900 bg-opacity-40 border border-white border-opacity-5 rounded-3xl animate-pulse flex items-center px-8 gap-6 backdrop-blur-sm">
            <div className="h-4 w-1/3 bg-zinc-800 rounded-full" />
            <div className="h-4 w-1/4 bg-zinc-800 rounded-full" />
            <div className="h-4 w-12 bg-zinc-800 rounded-full" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-16 pb-32 pt-10 animate-in fade-in duration-1000">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 bg-opacity-10 blur-[100px] rounded-full -mt-20 pointer-events-none" />
                <div className="space-y-6 relative z-10">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-3 text-zinc-600 hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-[0.3em] group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white bg-opacity-5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                            <ArrowLeftIcon className="w-4 h-4" />
                        </div>
                        Back to Ranking
                    </button>
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-4xl bg-gradient-to-br from-indigo-500 via-indigo-400 to-purple-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl italic uppercase tracking-tighter">
                            {profile?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">{profile?.name}</h1>
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center px-3 py-1 bg-indigo-500 bg-opacity-10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500 border-opacity-20">
                                    Official Profile
                                </div>
                                <span className="text-zinc-600 font-medium text-sm">{profile?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 bg-opacity-40 border border-white border-opacity-5 p-10 rounded-6xl flex items-center gap-8 backdrop-blur-3xl shadow-2xl relative group hover:scale-[1.02] transition-all duration-700">
                    <div className="text-right">
                        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.4em] font-black mb-2 italic">Total Euromotors</p>
                        <div className="flex items-baseline gap-3 justify-end">
                            <div className="text-6xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">{totalPoints.toLocaleString()}</div>
                            <span className="text-indigo-500 font-black uppercase text-xl italic">PTS</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-transparent opacity-5 rounded-6xl pointer-events-none" />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-10">
                    <div className="flex items-end justify-between px-6">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-white italic uppercase">Ruta de <span className="text-zinc-700">Progreso</span></h3>
                            <p className="text-zinc-500 text-sm font-medium">Historial detallado de checkpoints alcanzados</p>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="space-y-4">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : checkpoints.length === 0 ? (
                        <div className="text-center py-32 bg-zinc-900 bg-opacity-10 rounded-6xl border border-zinc-800 border-dashed backdrop-blur-sm">
                             <p className="text-zinc-600 font-medium italic">Sin actividad registrada en el ciclo actual 2026.</p>
                        </div>
                    ) : (
                        <div className="bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-6xl overflow-hidden shadow-2xl">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white bg-opacity-5 text-zinc-600 text-[9px] font-black uppercase tracking-[0.3em]">
                                            <th className="px-10 py-6">Mission / Route</th>
                                            <th className="px-10 py-6">Sector</th>
                                            <th className="px-10 py-6">Yield</th>
                                            <th className="px-10 py-6">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white divide-opacity-5">
                                        {currentPage.map((c) => (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-white hover:bg-opacity-5 active:bg-white active:bg-opacity-10 cursor-pointer group transition-all duration-500"
                                                onClick={() => setSelectedCheckIn(c)}
                                            >
                                                <td className="px-10 py-8">
                                                    <div className="text-zinc-100 font-bold group-hover:text-indigo-400 transition-colors tracking-tight text-lg">{c.routes?.title || '—'}</div>
                                                </td>
                                                <td className="px-10 py-8 text-zinc-500 text-sm font-medium">{c.checkpoints?.name || '—'}</td>
                                                <td className="px-10 py-8">
                                                    <span className="text-indigo-400 font-black tabular-nums text-xl">+{c.checkpoints?.points || 0}</span>
                                                </td>
                                                <td className="px-10 py-8 text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">{new Date(c.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {checkpoints.length > pageSize && (
                        <div className="flex justify-center items-center gap-10 pt-6">
                            <button
                                className="w-14 h-14 rounded-2xl bg-zinc-900 bg-opacity-60 border border-white border-opacity-5 text-zinc-600 hover:text-white hover:bg-zinc-800 disabled:opacity-20 transition-all duration-500 shadow-xl active:scale-90"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                <ArrowLeftIcon className="w-5 h-5 mx-auto" />
                            </button>
                            <span className="text-zinc-700 font-black text-[10px] uppercase tracking-[0.4em] bg-white bg-opacity-5 px-6 py-3 rounded-full border border-white border-opacity-5">Cycle {page}</span>
                            <button
                                className="w-14 h-14 rounded-2xl bg-zinc-900 bg-opacity-60 border border-white border-opacity-5 text-zinc-600 hover:text-white hover:bg-zinc-800 disabled:opacity-20 transition-all duration-500 shadow-xl active:scale-90"
                                disabled={page * pageSize >= checkpoints.length}
                                onClick={() => setPage(page + 1)}
                            >
                                <ArrowLeftIcon className="w-5 h-5 mx-auto rotate-180" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-12">
                    <div className="space-y-10">
                        <div className="px-4">
                            <h4 className="text-2xl font-black text-white italic uppercase">Vault <span className="text-zinc-700">Expended</span></h4>
                        </div>
                        {loading ? (
                            <div className="h-48 bg-zinc-900 bg-opacity-40 rounded-5xl border border-white border-opacity-5 animate-pulse backdrop-blur-sm" />
                        ) : redemptions.length === 0 ? (
                            <div className="p-12 bg-zinc-900 bg-opacity-10 rounded-5xl border border-zinc-800 border-dashed text-center backdrop-blur-sm">
                                <p className="text-zinc-700 text-sm font-medium italic">No se han registrado canjes aún.</p>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 bg-opacity-40 border border-white border-opacity-5 rounded-5xl overflow-hidden shadow-2xl backdrop-blur-3xl">
                                <div className="divide-y divide-white divide-opacity-5">
                                    {redemptions.map((r, idx) => (
                                        <div key={idx} className="p-8 hover:bg-white hover:bg-opacity-5 transition-all duration-500 group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="text-zinc-100 font-black text-sm uppercase tracking-tight group-hover:text-indigo-400 transition-colors italic">{r.rewards?.name || '—'}</div>
                                                <div className="text-red-500 text-opacity-80 font-black text-base tabular-nums">-{r.points_redeemed} <span className="text-[10px] text-zinc-700 uppercase">pts</span></div>
                                            </div>
                                            <div className="text-zinc-700 text-[9px] font-black uppercase tracking-widest italic">{new Date(r.redeemed_at).toLocaleDateString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedCheckIn && (
                        <div className="bg-zinc-900 bg-opacity-60 backdrop-blur-3xl border border-indigo-500 border-opacity-20 rounded-6xl p-10 animate-in zoom-in-95 duration-700 shadow-2xl relative overflow-hidden group/detail">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 bg-opacity-10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                            <button 
                                onClick={() => setSelectedCheckIn(null)}
                                className="absolute top-6 right-6 w-10 min-h-10 rounded-2xl bg-white bg-opacity-5 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-all duration-500 z-20"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>

                            <h4 className="font-black text-white text-xl mb-10 flex items-center gap-4 italic uppercase tracking-tighter">
                                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                                Entry Details
                            </h4>
                            
                            <div className="space-y-8 mb-10 relative z-10">
                                <div className="flex items-start gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-indigo-400 shrink-0">
                                        <MapPinIcon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 italic">Coordinates</p>
                                        <p className="text-white font-black text-sm tabular-nums">{selectedCheckIn.lat.toFixed(6)}, {selectedCheckIn.lng.toFixed(6)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-indigo-400 shrink-0">
                                        <VerifiedIcon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 italic">Status</p>
                                        <p className={`text-sm font-black uppercase tracking-tight ${selectedCheckIn.is_valid ? 'text-green-400' : 'text-red-500'}`}>
                                            {selectedCheckIn.is_valid ? 'Verified Entry' : 'Invalid Entry'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-indigo-400 shrink-0">
                                        <ClockIcon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 italic">Registered At</p>
                                        <p className="text-white font-black text-sm tabular-nums">{new Date(selectedCheckIn.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedCheckIn.picture && (
                                <div className="relative group/pic mb-10 overflow-hidden rounded-4xl border border-white border-opacity-5 shadow-2xl">
                                    <img
                                        src={`https://aezxnubglexywadbjpgo.supabase.co/storage/v1/object/public/pictures/${selectedCheckIn.picture}`}
                                        alt="Check-in proof"
                                        className="w-full h-56 object-cover transition-all duration-1000 group-hover/pic:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black bg-opacity-60 via-transparent to-transparent opacity-0 group-hover/pic:opacity-100 transition-opacity duration-700" />
                                </div>
                            )}

                            {selectedCheckIn.is_valid && (
                                <button
                                    onClick={() => invalidateCheckIn(selectedCheckIn.id)}
                                    className="w-full py-6 bg-black text-red-500 text-opacity-80 font-black uppercase tracking-[0.3em] text-[10px] rounded-3xl hover:bg-red-600 hover:text-white transition-all duration-700 shadow-2xl active:scale-95 border border-white border-opacity-5"
                                >
                                    Invalidate Record
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

RewardProfileDetail.getLayout = (page) => <RewardLayout>{page}</RewardLayout>;
export default RewardProfileDetail;