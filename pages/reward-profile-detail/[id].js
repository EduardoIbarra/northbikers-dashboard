import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';

export default function RewardProfileDetail() {
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
            is_euromotors
          )
        `)
                .eq('profile_id', id)
                .order('created_at', { ascending: false });

            if (checkpointError) {
                console.error('Error al cargar checkpoints:', checkpointError);
            } else {
                const filtered = checkpointData.filter(c => c.routes?.is_euromotors);
                setCheckpoints(filtered);
            }

            const { data: redemptionData, error: redemptionError } = await supabase
                .from('point_redemptions')
                .select('redeemed_at, points_redeemed, reward_articles(name)')
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

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-4">👤 Detalle del Participante</h1>

            <div className="bg-white shadow p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-2">{profile?.name}</h2>
                <p className="text-gray-600">📧 {profile?.email}</p>
                {profile?.city && <p className="text-gray-600">📍 {profile.city}</p>}
                {profile?.bike && <p className="text-gray-600">🏍️ {profile.bike}</p>}
            </div>

            <div className="mb-10">
                <h3 className="text-2xl font-semibold mb-4">🏆 Puntos Ganados: {totalPoints || 0}</h3>
                {currentPage.length === 0 ? (
                    <p className="text-gray-500">Este usuario aún no ha sumado puntos en rutas Euromotors.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border border-gray-200 shadow-sm rounded-lg">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Ruta</th>
                                    <th className="px-4 py-2">Checkpoint</th>
                                    <th className="px-4 py-2">Puntos</th>
                                    <th className="px-4 py-2">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPage.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setSelectedCheckIn(c)}
                                    >
                                        <td className="px-4 py-2">{c.routes?.title || '—'}</td>
                                        <td className="px-4 py-2">{c.checkpoints?.name || '—'}</td>
                                        <td className="px-4 py-2">{c.checkpoints?.points || 0}</td>
                                        <td className="px-4 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {checkpoints.length > pageSize && (
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <button
                            className="px-3 py-1 bg-gray-200 rounded"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            Anterior
                        </button>
                        <span>Página {page}</span>
                        <button
                            className="px-3 py-1 bg-gray-200 rounded"
                            disabled={page * pageSize >= checkpoints.length}
                            onClick={() => setPage(page + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {selectedCheckIn && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                    <h4 className="font-semibold text-lg mb-2">📍 Detalle del Check-in</h4>
                    <p><strong>Ruta:</strong> {selectedCheckIn.routes?.title || '—'}</p>
                    <p><strong>Checkpoint:</strong> {selectedCheckIn.checkpoints?.name || '—'}</p>
                    <p><strong>Coordenadas:</strong> {selectedCheckIn.lat}, {selectedCheckIn.lng}</p>
                    <p><strong>Distancia:</strong> {selectedCheckIn.distance?.toFixed(2)} m</p>
                    <p><strong>Fecha:</strong> {new Date(selectedCheckIn.created_at).toLocaleString()}</p>
                    <p><strong>Válido:</strong> {selectedCheckIn.is_valid ? '✅ Sí' : '❌ No'}</p>
                    {selectedCheckIn.picture && (
                        <img
                            src={`https://aezxnubglexywadbjpgo.supabase.in/storage/v1/object/public/pictures/${selectedCheckIn.picture}`}
                            alt="Check-in"
                            className="mt-4 rounded-lg max-h-64 object-cover"
                        />
                    )}
                    {selectedCheckIn.is_valid && (
                        <button
                            onClick={() => invalidateCheckIn(selectedCheckIn.id)}
                            className="mt-3 inline-block px-3 py-1 bg-yellow-500 text-white rounded"
                        >
                            Invalidar Check-in
                        </button>
                    )}
                    <button
                        onClick={() => setSelectedCheckIn(null)}
                        className="mt-3 ml-2 inline-block px-3 py-1 bg-red-500 text-white rounded"
                    >
                        Cerrar detalle
                    </button>
                </div>
            )}

            <div>
                <h3 className="text-2xl font-semibold mb-4">🎁 Historial de Canjes</h3>
                {redemptions.length === 0 ? (
                    <p className="text-gray-500">Aún no ha canjeado premios.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border border-gray-200 shadow-sm rounded-lg">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Premio</th>
                                    <th className="px-4 py-2">Puntos</th>
                                    <th className="px-4 py-2">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {redemptions.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{r.reward_articles?.name || '—'}</td>
                                        <td className="px-4 py-2">{r.points_redeemed}</td>
                                        <td className="px-4 py-2">{new Date(r.redeemed_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}