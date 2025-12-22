import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getLoggedUser, getSupabase } from '../utils/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';

const Home = () => {
  const router = useRouter();
  const supabase = getSupabase();
  const [loggedUser, setLoggedUser] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [participantCheckpoints, setParticipantCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch logged-in user
  useEffect(() => {
    const checkUser = async () => {
      const user = await getLoggedUser();
      setLoggedUser(user);
      if (!user) {
        router.push('/login');
      }
    };
    checkUser();
  }, [router]);

  // Fetch route data, participants, checkpoints, and participant checkpoints
  useEffect(() => {
    if (!loggedUser) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch route details (ID: 209)
        const { data: route, error: routeError } = await supabase
          .from('routes')
          .select('title, dates, venue, description, long_description, venue_link')
          .eq('id', 209)
          .single();

        if (routeError) {
          toast.error('Error fetching route data: ' + routeError.message);
          return;
        }

        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_profile')
          .select('profile_id, points, full_name, category, motorcycle')
          .eq('route_id', 209);

        if (participantsError) {
          toast.error('Error fetching participants: ' + participantsError.message);
          return;
        }

        // Fetch checkpoints
        const { data: checkpointsData, error: checkpointsError } = await supabase
          .from('event_checkpoints')
          .select('id, checkpoint_id, checkpoints(name, points, terrain, is_challenge)')
          .eq('event_id', 209);

        if (checkpointsError) {
          toast.error('Error fetching checkpoints: ' + checkpointsError.message);
          return;
        }

        // Fetch participant checkpoints
        const { data: participantCheckpointsData, error: participantCheckpointsError } = await supabase
          .from('profile_event_checkpoints')
          .select('profile_id, event_checkpoint_id')
          .eq('route_id', 209);

        if (participantCheckpointsError) {
          toast.error('Error fetching participant checkpoints: ' + participantCheckpointsError.message);
          return;
        }

        setRouteData(route);
        setParticipants(participantsData);
        setCheckpoints(checkpointsData);
        setParticipantCheckpoints(participantCheckpointsData);
      } catch (error) {
        toast.error('Unexpected error: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [loggedUser, supabase]);

  // Return null while checking user
  if (loggedUser === null) {
    return null;
  }

  // Calculate metrics
  const totalParticipants = participants.length;
  const totalCheckpoints = checkpoints.length;
  const challengeCheckpoints = checkpoints.filter(cp => cp.checkpoints.is_challenge).length;
  const terrainDistribution = {
    pavement: checkpoints.filter(cp => cp.checkpoints.terrain === 'pavement').length,
    dirt: checkpoints.filter(cp => cp.checkpoints.terrain === 'dirt').length,
  };
  const totalPointsPossible = checkpoints.reduce((sum, cp) => sum + (cp.checkpoints.points || 0), 0);
  const topPerformers = participants
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  const categoryBreakdown = participants.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const completionRate =
    totalCheckpoints > 0
      ? (participantCheckpoints.length / (totalParticipants * totalCheckpoints)) * 100
      : 0;

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
        <h2 className="text-3xl font-bold text-center mb-8">
          NorthBikers Dashboard - Rally Baja ADV 2025
        </h2>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : !routeData ? (
          <div className="text-center text-red-500">Failed to load route data.</div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Route Overview */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-2xl font-semibold mb-4">Route Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Title:</strong> {routeData.title}</p>
                  <p><strong>Dates:</strong> {routeData.dates}</p>
                  <p><strong>Venue:</strong> {routeData.venue}</p>
                  <p><strong>Total Participants:</strong> {totalParticipants}</p>
                </div>
                <div>
                  <p><strong>Total Checkpoints:</strong> {totalCheckpoints}</p>
                  <p><strong>Challenge Checkpoints:</strong> {challengeCheckpoints}</p>
                  <p><strong>Total Points Possible:</strong> {totalPointsPossible}</p>
                  <Link
                    href={`/routes?routeId=209`}
                    className="text-blue-400 hover:underline"
                  >
                    View Route Details
                  </Link>
                </div>
              </div>
            </div>

            {/* Participant Metrics */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-2xl font-semibold mb-4">Participant Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-lg font-medium">Top Performers</h4>
                  <ul className="mt-2">
                    {topPerformers.length > 0 ? (
                      topPerformers.map((p, index) => (
                        <li key={p.profile_id} className="mb-1">
                          {index + 1}. {p.full_name} - {p.points} points ({p.motorcycle})
                        </li>
                      ))
                    ) : (
                      <li>No data available</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-medium">Category Breakdown</h4>
                  <ul className="mt-2">
                    {Object.entries(categoryBreakdown).map(([category, count]) => (
                      <li key={category} className="mb-1">
                        {category}: {count} participants
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-medium">Progress</h4>
                  <p>Completion Rate: {completionRate.toFixed(2)}%</p>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkpoint Insights */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-2xl font-semibold mb-4">Checkpoint Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-medium">Terrain Distribution</h4>
                  <p>Pavement: {terrainDistribution.pavement} checkpoints</p>
                  <p>Dirt: {terrainDistribution.dirt} checkpoints</p>
                </div>
                <div>
                  <h4 className="text-lg font-medium">Sample Checkpoints</h4>
                  <ul className="mt-2">
                    {checkpoints.slice(0, 3).map(cp => (
                      <li key={cp.id} className="mb-1">
                        {cp.checkpoints.name} - {cp.checkpoints.points} points
                        {cp.checkpoints.is_challenge && ' (Challenge)'}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/routes/checkpoints?routeId=209`}
                    className="text-blue-400 hover:underline"
                  >
                    View All Checkpoints
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;