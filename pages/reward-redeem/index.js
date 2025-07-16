import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';

export default function RewardRedeemPage() {
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
    setSelectedProfile(profile);

    const { data: pointsData, error: pointsError } = await supabase
      .rpc('get_euromotors_rankings');
    if (pointsError) return console.error('Error al obtener puntos:', pointsError);

    const total = pointsData.find((p) => p.profile_id === profile.id)?.total_points || 0;

    const { data: redeemedData, error: redeemedError } = await supabase
      .from('point_redemptions')
      .select('points_redeemed')
      .eq('user_id', profile.id);
    if (redeemedError) return console.error('Error al obtener redenciones:', redeemedError);

    const redeemed = redeemedData.reduce((sum, r) => sum + r.points_redeemed, 0);
    const expendable = total - redeemed;

    setAvailablePoints(expendable);

    const { data: rewardsData, error: rewardsError } = await supabase
      .from('reward_articles')
      .select('*')
      .lte('minimum_points', expendable)
      .eq('is_valid', true);

    if (rewardsError) return console.error('Error al cargar premios:', rewardsError);
    setRewards(rewardsData);
  };

  const redeem = async (reward) => {
    if (!selectedProfile) return;
    const confirmed = confirm(`¿Canjear "${reward.name}" por ${reward.minimum_points} puntos?`);
    if (!confirmed) return;

    setRedeeming(reward.id);

    const { error } = await supabase.from('point_redemptions').insert({
      user_id: selectedProfile.id,
      reward_article_id: reward.id,
      points_redeemed: reward.minimum_points,
      notes: 'Canje realizado desde el panel',
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-bold mb-6 text-center">Canje de Puntos</h1>

      {/* Buscador */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar usuario por nombre o correo"
          value={search}
          onChange={handleSearchInput}
          onKeyDown={handleSearchKey}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-400"
        />
        <button
          onClick={searchProfiles}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          disabled={!search.trim()}
        >
          Buscar
        </button>
      </div>

      {/* Lista de usuarios */}
      {profiles.length > 0 && (
        <ul className="mb-6 space-y-2">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => selectProfile(p)}
                className="w-full text-left px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                {p.name || 'Sin nombre'} <span className="text-gray-500">({p.email})</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Usuario seleccionado y premios */}
      {selectedProfile && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">
            {selectedProfile.name} —{' '}
            <span className="text-green-600 font-bold">{availablePoints} pts disponibles</span>
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Premios disponibles</h3>
          {rewards.length === 0 ? (
            <p className="text-gray-500">No hay premios disponibles con los puntos actuales.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse rounded-lg overflow-hidden shadow-md">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-4 py-2 border-b">Premio</th>
                    <th className="px-4 py-2 border-b">Costo (pts)</th>
                    <th className="px-4 py-2 border-b text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 border-b">{r.name}</td>
                      <td className="px-4 py-2 border-b">{r.minimum_points}</td>
                      <td className="px-4 py-2 border-b text-right">
                        <button
                          onClick={() => redeem(r)}
                          disabled={redeeming === r.id}
                          className={`px-3 py-1 rounded-lg text-white ${
                            redeeming === r.id
                              ? 'bg-gray-400'
                              : 'bg-green-600 hover:bg-green-700'
                          } transition`}
                        >
                          {redeeming === r.id ? 'Procesando...' : 'Canjear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
