import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';
import RewardLayout from './_layout';

// Icon Components
const SearchIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UserIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const CheckIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
);

const ArrowIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
);

import Link from 'next/link';

function RewardRedeemPage() {
    const supabase = getSupabase();

    const [search, setSearch] = useState('');
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [redeeming, setRedeeming] = useState(null);

    const searchProfiles = async () => {
        if (!search.trim()) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email')
            .or(`email.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);

        if (error) {
            console.error('Error al buscar perfiles:', error);
        } else {
            setProfiles(data);
        }

        setLoading(false);
    };

    const handleSearchInput = (e) => {
        setSearch(e.target.value);
        if (!e.target.value.trim()) {
            setProfiles([]);
            setSelectedProfile(null);
            setRewards([]);
            setAvailablePoints(0);
        }
    };

    const handleSearchKey = (e) => {
        if (e.key === 'Enter') {
            searchProfiles();
        }
    };

    const selectProfile = async (profile) => {
        setLoading(true);
        setSelectedProfile(profile);

        const { data: pointsData, error: pointsError } = await supabase
            .rpc('get_euromotors_rankings');
        if (pointsError) {
            setLoading(false);
            return console.error('Error al obtener puntos:', pointsError);
        }

        const total = pointsData.find((p) => p.profile_id === profile.id)?.total_points || 0;

        const { data: redeemedData, error: redeemedError } = await supabase
            .from('point_redemptions')
            .select('points_redeemed')
            .eq('user_id', profile.id);
        if (redeemedError) {
            setLoading(false);
            return console.error('Error al obtener redenciones:', redeemedError);
        }

        const redeemed = redeemedData.reduce((sum, r) => sum + r.points_redeemed, 0);
        const expendable = total - redeemed;

        setAvailablePoints(expendable);

        const { data: rewardsData, error: rewardsError } = await supabase
            .from('rewards')
            .select('*')
            .order('points', { ascending: true });

        if (rewardsError) {
            setLoading(false);
            return console.error('Error al cargar premios:', rewardsError);
        }
        setRewards(rewardsData);
        setLoading(false);
    };

    const handleRedeem = async (profileId, rewardId) => {
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward || !selectedProfile || availablePoints <= 0) return;

        const pointsToSpend = reward.reset_on_change ? Math.min(availablePoints, reward.points) : 0;
        const calculatedDiscount = Math.min(
            (availablePoints / reward.points) * reward.max_percent_discount,
            reward.max_percent_discount
        ).toFixed(2);

        const message = reward.reset_on_change
            ? `¿Canjear "${reward.name}" por un cupón del ${calculatedDiscount}% de descuento usando ${pointsToSpend} puntos?`
            : `¿Obtener un cupón del ${calculatedDiscount}% de descuento para "${reward.name}"? Sus puntos NO se verán afectados.`;

        const confirmed = confirm(message);
        if (!confirmed) return;

        setRedeeming(reward.id);

        const { error } = await supabase.from('point_redemptions').insert({
            user_id: selectedProfile.id,
            reward_article_id: reward.id,
            points_redeemed: pointsToSpend,
            notes: `Canje por ${calculatedDiscount}% de descuento (${reward.reset_on_change ? 'puntos canjeados' : 'puntos mantenidos'})`,
        });

        if (error) {
            console.error('Error al canjear:', error);
            alert('Hubo un error al registrar el canje.');
        } else {
            alert('¡Canje exitoso!');
            await selectProfile(selectedProfile); // refrescar datos
        }

        setRedeeming(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-16 pb-32 pt-10">
            <header className="text-center space-y-6 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500 bg-opacity-10 blur-[100px] rounded-full -mt-20 pointer-events-none" />
                <div className="inline-flex items-center px-4 py-1.5 bg-indigo-500 bg-opacity-5 border border-indigo-500 border-opacity-10 rounded-full backdrop-blur-md">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Vault Access</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white italic uppercase">
                    Canjear <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">Puntos</span>
                </h1>
                <p className="text-zinc-500 max-w-xl mx-auto text-base leading-relaxed font-medium">
                    Busca un piloto para gestionar sus recompensas y aplicar los beneficios de su trayectoria.
                </p>
            </header>

            {/* Buscador Moderno */}
            <div className="relative group max-w-3xl mx-auto">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-5xl blur opacity-10 group-focus-within:opacity-30 transition duration-700"></div>
                <div className="relative flex items-center bg-zinc-900 bg-opacity-60 backdrop-blur-2xl rounded-4xl border border-white border-opacity-5 p-3 shadow-2xl">
                    <div className="pl-6 text-indigo-400 text-opacity-60">
                        <SearchIcon className="w-6 h-6" />
                    </div>
                    <input
                        type="text"
                        placeholder="Nombre o correo del piloto..."
                        value={search}
                        onChange={handleSearchInput}
                        onKeyDown={handleSearchKey}
                        className="flex-1 px-6 py-4 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-lg font-medium selection:bg-indigo-500 bg-opacity-40"
                    />
                    <button
                        onClick={searchProfiles}
                        disabled={loading || !search.trim()}
                        className="px-10 py-4 bg-white text-black hover:bg-indigo-500 hover:text-white disabled:bg-zinc-800 disabled:text-zinc-600 font-black uppercase tracking-widest text-xs rounded-2xl transition-all duration-500 shadow-xl active:scale-95"
                    >
                        {loading ? '...' : 'Buscar'}
                    </button>
                </div>
            </div>

            {/* Lista de usuarios con Liquid Glass */}
            {profiles.length > 0 && !selectedProfile && (
                <div className="max-w-2xl mx-auto bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-5xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-10 duration-700">
                    <div className="p-8 border-b border-white border-opacity-5 bg-white bg-opacity-5">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Resultados de búsqueda</h3>
                    </div>
                    <div className="divide-y divide-white divide-opacity-5">
                        {profiles.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => selectProfile(p)}
                                className="w-full flex items-center justify-between px-10 py-6 hover:bg-white hover:bg-opacity-5 transition-all duration-500 group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-full bg-black border border-white border-opacity-5 flex items-center justify-center text-zinc-600 group-hover:text-indigo-400 group-hover:border-indigo-500 group-hover:border-opacity-20 transition-all duration-500">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-zinc-100 font-bold text-lg group-hover:text-white transition-colors tracking-tight">{p.name || 'Sin nombre'}</div>
                                        <div className="text-zinc-500 text-xs italic font-medium">{p.email}</div>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-black border border-white border-opacity-5 flex items-center justify-center text-zinc-600 group-hover:bg-indigo-500 group-hover:text-white group-hover:scale-110 transition-all duration-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Panel de Usuario con Liquid Glass */}
            {selectedProfile && (
                <div className="space-y-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-6xl p-10 md:p-16 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 bg-opacity-10 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 bg-opacity-10 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                            <div className="space-y-4">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-4xl bg-indigo-500 bg-opacity-20 border border-indigo-500 border-opacity-20 flex items-center justify-center text-indigo-400">
                                        <UserIcon className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selectedProfile.name}</h2>
                                        <div className="flex items-center gap-3">
                                            <div className="inline-flex items-center px-3 py-1 bg-green-500 bg-opacity-10 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-500 border-opacity-20">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
                                                Verified Pilot
                                            </div>
                                            <span className="text-zinc-600 text-sm font-medium">{selectedProfile.email}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 bg-black bg-opacity-40 border border-white border-opacity-5 p-10 rounded-5xl backdrop-blur-3xl relative group/balance transition-all duration-700 hover:scale-[1.02]">
                                <div className="text-right space-y-1">
                                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">AVAILABLE BALANCE</p>
                                    <div className="flex items-baseline gap-3 justify-end">
                                        <div className="text-6xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">{availablePoints.toLocaleString()}</div>
                                        <span className="text-indigo-500 font-black uppercase text-xl italic">PTS</span>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-transparent opacity-5 rounded-5xl pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div className="flex items-end justify-between px-8">
                            <div className="space-y-2">
                                <h3 className="text-4xl font-black text-white italic uppercase">Recompensas</h3>
                                <p className="text-zinc-500 text-sm font-medium tracking-wide">Desbloquea beneficios exclusivos con tu trayectoria</p>
                            </div>
                            <div className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] bg-white bg-opacity-5 px-4 py-2 rounded-full border border-white border-opacity-5">
                                {rewards.length} Tiered items
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="h-64 bg-zinc-900 bg-opacity-40 rounded-5xl animate-pulse border border-white border-opacity-5" />
                                ))}
                            </div>
                        ) : rewards.length === 0 ? (
                            <div className="text-center py-32 bg-zinc-900 bg-opacity-10 rounded-6xl border border-zinc-800 border-dashed backdrop-blur-sm">
                                <p className="text-zinc-600 font-medium italic">No se han encontrado recompensas en la bóveda...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-20">
                                {rewards.map((r) => {
                                    const ratio = Math.min(availablePoints / r.points, 1);
                                    const currentDiscount = (ratio * r.max_percent_discount).toFixed(1);
                                    const isFullyEligible = ratio >= 1;

                                    return (
                                        <div key={r.id} className="bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-5xl p-10 flex flex-col transition-all duration-700 hover:bg-zinc-900 hover:bg-opacity-60 group relative overflow-hidden shadow-2xl">
                                            {isFullyEligible && (
                                                <div className="absolute -top-3 -right-3 bg-indigo-500 text-white text-[9px] font-black uppercase px-6 py-2 rounded-full shadow-2xl z-20 shadow-xl tracking-widest flex items-center gap-2">
                                                    <CheckIcon className="w-3 h-3" />
                                                    Max Reward
                                                </div>
                                            )}
                                            
                                            <div className="flex-1 space-y-8 mb-10">
                                                <div className="flex items-start justify-between gap-6">
                                                    <div className="space-y-3">
                                                        <h4 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase italic tracking-tight">{r.name}</h4>
                                                        <p className="text-zinc-500 text-sm font-medium leading-relaxed line-clamp-2">{r.description}</p>
                                                    </div>
                                                    <div className="text-right bg-black bg-opacity-40 p-4 rounded-3xl border border-white border-opacity-5 min-w-[100px]">
                                                        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-1">Target</div>
                                                        <div className="text-lg font-black text-indigo-400">{r.points.toLocaleString()} <span className="text-[10px] text-zinc-600 font-bold">PTS</span></div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 p-8 bg-black bg-opacity-40 rounded-4xl border border-white border-opacity-5 backdrop-blur-md relative overflow-hidden">
                                                    <div className="flex justify-between items-end relative z-10">
                                                        <div>
                                                            <div className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-2">Discount Unlocked</div>
                                                            <div className="text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">{currentDiscount}%</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[9px] font-black text-indigo-500 bg-opacity-40 uppercase tracking-[0.3em] mb-2">Total cap</div>
                                                            <div className="text-xl font-black text-zinc-400 bg-white bg-opacity-5 px-4 py-1.5 rounded-full border border-white border-opacity-5 tracking-tighter">{r.max_percent_discount}%</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white border-opacity-5">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                                            style={{ width: `${ratio * 100}%` }}
                                                        />
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-5 pointer-events-none" />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRedeem(selectedProfile.id, r.id)}
                                                disabled={redeeming === r.id || availablePoints <= 0}
                                                className={`w-full py-6 rounded-3xl text-xs font-black uppercase tracking-[0.4em] transition-all duration-700 ${
                                                    redeeming === r.id || availablePoints <= 0
                                                        ? 'bg-zinc-800 bg-opacity-50 text-zinc-600 cursor-not-allowed border border-white border-opacity-5'
                                                        : 'bg-white text-black hover:bg-indigo-600 hover:text-white shadow-2xl active:scale-95 border border-white'
                                                }`}
                                            >
                                                {redeeming === r.id ? (
                                                    <span className="flex items-center justify-center gap-3">
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Processing
                                                    </span>
                                                ) : 'Claim Experience'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

RewardRedeemPage.getLayout = (page) => <RewardLayout>{page}</RewardLayout>;
export default RewardRedeemPage;