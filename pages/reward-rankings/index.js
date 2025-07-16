import { useEffect, useState } from 'react';
import { getSupabase } from '../../utils/supabase';
import Link from 'next/link';

export default function RewardRankingsPage() {
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-6">Ranking de Puntos Euromotors</h1>

      {loading ? (
        <p className="text-center text-gray-500">Cargando...</p>
      ) : rankings.length === 0 ? (
        <p className="text-center text-gray-500">No hay participantes aún.</p>
      ) : (
        <ol className="space-y-2">
          {rankings.map((r, index) => (
            <li
              key={r.profile_id}
              className="flex justify-between items-center px-4 py-2 bg-white shadow rounded-lg hover:bg-gray-50 transition"
            >
              <Link
                href={`/reward-profile-detail/${r.profile_id}`}
                className="text-gray-800 hover:text-blue-600 font-medium"
              >
                #{index + 1} — {r.name}
              </Link>
              <span className="text-blue-600 font-bold">{r.total_points} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
