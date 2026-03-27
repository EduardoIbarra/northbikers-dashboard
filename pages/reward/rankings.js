import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';
import Link from 'next/link';
import RewardLayout from './_layout';

// Medal Icon Components
const MedalIcon = ({ rank, className }) => {
    const colors = {
        1: 'text-amber-400',
        2: 'text-zinc-400',
        3: 'text-orange-400',
    };
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={`${colors[rank]} ${className}`}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15l-2 5l2 2l2-2l-2-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a7 7 0 100-14 7 7 0 000 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11l-2-2l2-2l2 2l-2 2z" />
        </svg>
    );
};

function RewardRankingsPage() {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const supabase = getSupabase();

    useEffect(() => {
        const fetchRankings = async () => {
            const { data, error } = await supabase.rpc('get_euromotors_rankings');
            if (error) {
                console.error('Error al cargar el ranking:', error);
            } else {
                setRankings(data);
            }
            setLoading(false);
        };

        fetchRankings();
    }, []);

    const PodiumCard = ({ rank, profile }) => {
        const medalGradients = {
            1: 'from-amber-200 bg-opacity-20 via-amber-500 bg-opacity-10 to-transparent border-amber-500 border-opacity-20',
            2: 'from-zinc-200 bg-opacity-20 via-zinc-500 bg-opacity-10 to-transparent border-zinc-500 border-opacity-20',
            3: 'from-orange-200 bg-opacity-20 via-orange-500 bg-opacity-10 to-transparent border-orange-500 border-opacity-20',
        };

        return (
            <div className={`relative flex flex-col items-center p-10 rounded-5xl bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border shadow-2xl transition-all duration-700 hover:scale-[1.05] group overflow-hidden ${medalGradients[rank]} ${rank === 1 ? 'md:-mt-12 md:mb-12 ring-1 ring-white ring-opacity-10' : 'border-white border-opacity-5'}`}>
                {/* Background glow */}
                <div className={`absolute top-0 left-0 w-full h-full opacity-20 bg-gradient-to-b ${rank === 1 ? 'from-amber-500' : rank === 2 ? 'from-zinc-400' : 'from-orange-400'} to-transparent pointer-events-none`} />

                <div className="relative mb-8 group-hover:rotate-12 transition-transform duration-700">
                    <div className={`w-24 h-24 rounded-4xl bg-black bg-opacity-80 border border-white border-opacity-10 flex items-center justify-center p-5 shadow-2xl relative z-10`}>
                        <MedalIcon rank={rank} className="w-full h-full drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
                    </div>
                    <div className={`absolute inset-0 blur-2xl rounded-full opacity-50 ${rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-zinc-400' : 'bg-orange-400'}`} />
                </div>

                <h3 className="text-2xl font-black text-white text-center mb-2 line-clamp-1 italic tracking-tight uppercase">{profile.name}</h3>
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-8 ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-zinc-400' : 'text-orange-400'}`}>Rank #{rank}</p>

                <div className="px-8 py-3 bg-white bg-opacity-5 rounded-full border border-white border-opacity-10 backdrop-blur-md">
                    <span className="text-xl font-black text-indigo-400 tabular-nums">{profile.total_points.toLocaleString()}</span>
                    <span className="text-zinc-500 text-[10px] ml-2 font-black uppercase tracking-widest">pts</span>
                </div>
            </div>
        );
    };

    const SkeletonRow = () => (
        <div className="h-20 w-full bg-zinc-900 bg-opacity-40 backdrop-blur-md rounded-4xl border border-white border-opacity-5 flex items-center px-8 gap-6 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-zinc-800" />
            <div className="flex-1 h-3 bg-zinc-800 rounded-full max-w-[200px]" />
            <div className="w-24 h-3 bg-zinc-800 rounded-full" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-16 pb-32 pt-10">
            <header className="text-center space-y-6 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500 bg-opacity-10 blur-[100px] rounded-full -mt-20 pointer-events-none" />
                <div className="inline-flex items-center px-4 py-1.5 bg-indigo-500 bg-opacity-5 border border-indigo-500 border-opacity-10 rounded-full backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">The Elite Circle</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white italic uppercase">
                    Hall of <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">Fame</span>
                </h1>
                <p className="text-zinc-500 max-w-xl mx-auto text-base leading-relaxed font-medium">
                    Los pilotos más destacados de la temporada. Cada ruta es una oportunidad para alcanzar la gloria máxima.
                </p>
            </header>

            {loading ? (
                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-80 bg-zinc-900 bg-opacity-40 rounded-5xl animate-pulse border border-white border-opacity-5 ${i === 2 ? 'md:-mt-12' : ''}`} />
                        ))}
                    </div>
                    <div className="space-y-4">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </div>
                </div>
            ) : rankings.length === 0 ? (
                <div className="text-center py-24 bg-zinc-900 bg-opacity-10 rounded-6xl border border-zinc-800 border-dashed backdrop-blur-sm">
                    <p className="text-zinc-500 text-lg font-medium italic">Esperando a los primeros campeones de la temporada...</p>
                </div>
            ) : (
                <div className="space-y-24">
                    {/* Top 3 Podium */}
                    {rankings.length >= 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-12 px-4 md:px-0">
                            {/* Order for mobile/md: 2 - 1 - 3 */}
                            <div className="order-2 md:order-1 flex flex-col justify-end">
                                {rankings[1] && <PodiumCard rank={2} profile={rankings[1]} />}
                            </div>
                            <div className="order-1 md:order-2 z-10">
                                {rankings[0] && <PodiumCard rank={1} profile={rankings[0]} />}
                            </div>
                            <div className="order-3 md:order-3 flex flex-col justify-end">
                                {rankings[2] && <PodiumCard rank={3} profile={rankings[2]} />}
                            </div>
                        </div>
                    )}

                    {/* List Table */}
                    {rankings.length > 3 && (
                        <div className="bg-zinc-900 bg-opacity-30 rounded-5xl border border-white border-opacity-5 overflow-hidden backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-5 pointer-events-none" />
                            <div className="px-10 py-8 border-b border-white border-opacity-5 bg-white bg-opacity-5 flex items-center justify-between">
                                <h2 className="text-xl font-black text-white italic tracking-tight">MÁS PARTICIPANTES</h2>
                                <div className="w-12 h-1 bg-indigo-500 bg-opacity-50 rounded-full" />
                            </div>
                            <div className="divide-y divide-white divide-opacity-5">
                                {rankings.slice(3).map((r, index) => (
                                    <Link
                                        key={r.profile_id}
                                        href={`/reward/profile-detail/${r.profile_id}`}
                                        className="flex justify-between items-center px-10 py-6 hover:bg-white hover:bg-opacity-5 active:bg-white active:bg-opacity-10 transition-all duration-500 group"
                                    >
                                        <div className="flex items-center gap-8">
                                            <span className="text-zinc-700 font-black italic text-lg w-10 group-hover:text-indigo-400 transition-colors">#{index + 4}</span>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-100 font-bold tracking-tight text-lg group-hover:text-white transition-colors">
                                                    {r.name}
                                                </span>
                                                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest group-hover:text-zinc-500">MEMBER RANK</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-black bg-opacity-40 px-6 py-3 rounded-full border border-white border-opacity-5 group-hover:border-indigo-500 group-hover:border-opacity-20 transition-all">
                                            <span className="text-indigo-400 font-black tabular-nums text-lg">{r.total_points.toLocaleString()}</span>
                                            <span className="text-zinc-600 text-[10px] uppercase font-black tracking-[0.2em]">pts</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

RewardRankingsPage.getLayout = (page) => <RewardLayout>{page}</RewardLayout>;
export default RewardRankingsPage;