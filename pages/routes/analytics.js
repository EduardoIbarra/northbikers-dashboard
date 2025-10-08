// pages/routes/analytics.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { getSupabase } from '../../utils/supabase';

const CHART = {
  bg: '#0b0b0b',
  text: '#f5f5f5',
  grid: '#222',
  primary: '#FFD60A',
  series: ['#FFD60A', '#FFE169', '#FFEE93', '#FFC300', '#E6B400']
};

function applyTheme() {
  Highcharts.setOptions({
    chart: { backgroundColor: CHART.bg, style: { fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' } },
    title: { style: { color: CHART.text } },
    xAxis: { lineColor: CHART.grid, tickColor: CHART.grid, labels: { style: { color: CHART.text } } },
    yAxis: { gridLineColor: CHART.grid, title: { style: { color: CHART.text } }, labels: { style: { color: CHART.text } } },
    legend: { itemStyle: { color: CHART.text } },
    tooltip: { backgroundColor: '#111', borderColor: CHART.primary, style: { color: CHART.text } },
    plotOptions: { column: { colorByPoint: true, colors: CHART.series } },
    colors: CHART.series
  });
}

export default function RouteAnalytics() {
  const supabase = getSupabase();
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null); // payload del RPC

  useEffect(() => { applyTheme(); }, []);

  // cargar rutas para el selector
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('id,title')
        .order('created_at', { ascending: false });
      if (!cancelled) {
        if (error) console.error('Error cargando rutas', error);
        setRoutes(data || []);
        if (data?.length) setRouteId(data[0].id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // cargar dashboard por RPC
  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('nb_route_dashboard_json', { _route_id: routeId });
      if (!cancelled) {
        if (error) {
          console.error('Error RPC nb_route_dashboard_json:', error);
          setDash(null);
        } else {
          setDash(data);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [routeId]);

  const kpis = dash?.route || {};
  const km  = dash?.km || {};
  const trend = dash?.trend_30d ?? [];
  const trophies = dash?.trophies_by_type ?? [];
  const cp = dash?.checkpoint_progress ?? [];
  const topPoints = dash?.top_riders?.by_points ?? [];

  const trendOptions = useMemo(() => ({
    title: { text: 'Check-ins (últimos 30 días)' },
    xAxis: { categories: trend.map(d => new Date(d.day).toLocaleDateString()), tickInterval: 4 },
    yAxis: { title: { text: 'Check-ins' }, allowDecimals: false },
    series: [{ type: 'line', name: 'Check-ins', data: trend.map(d => d.check_ins), color: CHART.primary }]
  }), [trend]);

  const checkpointsOptions = useMemo(() => ({
    title: { text: 'Avance por checkpoint' },
    xAxis: { categories: cp.map(c => `#${c.seq}`) },
    yAxis: { title: { text: '% Completado' }, max: 100 },
    series: [{ type: 'column', name: '% perfiles con touch', data: cp.map(c => Number(c.completion_pct)) }]
  }), [cp]);

  const trophiesOptions = useMemo(() => ({
    title: { text: 'Trofeos por tipo' },
    series: [{ type: 'pie', name: 'Trofeos', innerSize: '60%', data: trophies.map(t => ({ name: t.trophy_name, y: t.count })) }]
  }), [trophies]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ background: CHART.bg, minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: CHART.text }}>Analytics de Ruta</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: CHART.text }}>Ruta:</label>
          <select
            value={routeId ?? ''}
            onChange={e => setRouteId(Number(e.target.value))}
            className="bg-black text-white border border-yellow-400 rounded px-3 py-2"
          >
            {routes.map(r => <option key={r.id} value={r.id}>{r.title || `#${r.id}`}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">Cargando...</p>
      ) : !dash ? (
        <p className="text-center text-red-400">No se pudo cargar la información.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <KPI label="Registrados" value={kpis.participants_registered} />
            <KPI label="Activos" value={kpis.participants_active} />
            <KPI label="Check-ins válidos" value={kpis.check_ins_valid} />
            <KPI label="Puntos totales" value={Math.round(kpis.points_total ?? 0)} />
            <KPI label="Trofeos" value={kpis.trophies_total} />
            <KPI label="Feeds" value={kpis.feeds_total} />
            <KPI label="Checkpoints" value={kpis.checkpoints_total} />
            <KPI label="% Cobertura" value={`${kpis.checkpoints_coverage_pct ?? 0}%`} />
            <KPI label="1er check-in" value={kpis.first_checkin_at ? new Date(kpis.first_checkin_at).toLocaleString() : '-'} small />
            <KPI label="Último check-in" value={kpis.last_checkin_at ? new Date(kpis.last_checkin_at).toLocaleString() : '-'} small />
            <KPI label="KM (camino)" value={km?.path_km ?? 0} />
            <KPI label="KM (bucle)" value={km?.loop_km ?? 0} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <HighchartsReact highcharts={Highcharts} options={trendOptions} />
            </Card>
            <Card>
              <HighchartsReact highcharts={Highcharts} options={checkpointsOptions} />
            </Card>

            <div className="lg:col-span-2">
              <Card>
                <HighchartsReact highcharts={Highcharts} options={trophiesOptions} />
              </Card>
            </div>
          </div>

          {/* Top riders */}
          <div className="mt-6">
            <Card title="Top riders por puntos">
              <div className="overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-sm" style={{ color: '#bbb' }}>
                      <th className="py-2">Rider</th>
                      <th className="py-2">Puntos</th>
                      <th className="py-2">Check-ins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPoints.map((r, i) => (
                      <tr key={r.profile_id} className="border-t border-neutral-800">
                        <td className="py-2 flex items-center gap-3">
                          <img src={r.avatar_url || '/icon.jpg'} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-white">{r.display_name || r.profile_id?.slice(0, 8)}</span>
                          <span className="text-xs text-black bg-yellow-400 rounded px-2 py-0.5">#{i + 1}</span>
                        </td>
                        <td className="py-2 text-white">{Math.round(r.points)}</td>
                        <td className="py-2 text-white">{r.checkins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, small }) {
  return (
    <div className="rounded-xl p-4 border border-yellow-500/30" style={{ background: 'linear-gradient(180deg,#0f0f0f,#0a0a0a)' }}>
      <div className="text-xs uppercase tracking-wide text-yellow-400">{label}</div>
      <div className={`font-semibold ${small ? 'text-sm' : 'text-2xl'} text-white mt-1`}>{value ?? '-'}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-4 border border-neutral-800" style={{ background: 'linear-gradient(180deg,#0f0f0f,#0a0a0a)' }}>
      {title && <div className="text-sm mb-2 text-yellow-400">{title}</div>}
      {children}
    </div>
  );
}
