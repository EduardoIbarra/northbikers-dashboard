import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useRecoilValue } from 'recoil';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { FiActivity, FiArrowRight, FiAward, FiCalendar, FiCheckCircle, FiFlag, FiMapPin, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CurrentRoute } from '../store/atoms/global';
import { getLoggedUser } from '../utils';
import { getSupabase } from '../utils/supabase';

const COLORS = { gold: '#f6c453', muted: '#94949c', grid: 'rgba(255,255,255,.07)' };
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

const CATEGORY_LABELS = {
  DUAL_SPORT: 'Doble propósito / ADV',
  DIRT: 'Terracería',
  STREET: 'Urbana',
  SPORT: 'Deportiva',
  FEMALE: 'Femenil',
  COUPLE: 'Pareja',
  TEAM: 'Equipo',
  UNASSIGNED: 'Sin categoría',
};

const categoryLabel = (category) => CATEGORY_LABELS[String(category || 'UNASSIGNED').toUpperCase()] || category;
const terrainLabel = (terrain) => ({ pavement: 'Pavimento', dirt: 'Terracería' }[String(terrain || '').toLowerCase()] || terrain || 'Otro');

export default function Home() {
  const router = useRouter();
  const currentRoute = useRecoilValue(CurrentRoute);
  const supabase = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState(undefined);
  const [route, setRoute] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [touches, setTouches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedUser = getLoggedUser();
    setUser(loggedUser);
    if (!loggedUser) router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!user || !currentRoute?.id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all([
          supabase.from('routes').select('id,title,dates,venue,description,start_timestamp,end_timestamp').eq('id', currentRoute.id).single(),
          supabase.from('event_profile').select('profile_id,points,full_name,category,motorcycle').eq('route_id', currentRoute.id),
          supabase.from('event_checkpoints').select('id,checkpoint_id,checkpoints(name,points,terrain,is_challenge)').eq('event_id', currentRoute.id),
          supabase.from('profile_event_checkpoints').select('profile_id,event_checkpoint_id').eq('route_id', currentRoute.id),
        ]);
        const failed = results.find(item => item.error);
        if (failed) throw failed.error;
        if (active) {
          setRoute(results[0].data);
          setParticipants(results[1].data || []);
          setCheckpoints(results[2].data || []);
          setTouches(results[3].data || []);
        }
      } catch (error) {
        if (active) { setRoute(null); toast.error(`No se pudo cargar el tablero: ${error.message}`); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [currentRoute?.id, user, supabase]);

  const data = useMemo(() => {
    const riderCount = participants.length;
    const checkpointCount = checkpoints.length;
    const categories = participants.reduce((out, rider) => {
      const name = categoryLabel(rider.category); out[name] = (out[name] || 0) + 1; return out;
    }, {});
    const terrain = checkpoints.reduce((out, cp) => {
      const name = terrainLabel(cp.checkpoints?.terrain); out[name] = (out[name] || 0) + 1; return out;
    }, {});
    const touchCount = touches.reduce((out, item) => {
      out[item.event_checkpoint_id] = (out[item.event_checkpoint_id] || 0) + 1; return out;
    }, {});
    const performance = checkpoints.map((cp, index) => ({
      name: cp.checkpoints?.name || `Checkpoint ${index + 1}`,
      value: riderCount ? Math.round(((touchCount[cp.id] || 0) / riderCount) * 100) : 0,
    }));
    const activeRiders = new Set(touches.map(item => item.profile_id)).size;
    return {
      riderCount, checkpointCount, categories, terrain, performance, activeRiders,
      activeRate: riderCount ? activeRiders / riderCount * 100 : 0,
      completion: riderCount * checkpointCount ? touches.length / (riderCount * checkpointCount) * 100 : 0,
      challengeCount: checkpoints.filter(cp => cp.checkpoints?.is_challenge).length,
      totalPoints: participants.reduce((sum, rider) => sum + Number(rider.points || 0), 0),
      availablePoints: checkpoints.reduce((sum, cp) => sum + Number(cp.checkpoints?.points || 0), 0),
      top: [...participants].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).slice(0, 5),
    };
  }, [participants, checkpoints, touches]);

  const baseChart = useMemo(() => ({
    chart: { backgroundColor: 'transparent', style: { fontFamily: 'Inter,system-ui,sans-serif' } },
    credits: { enabled: false }, title: { text: undefined },
    legend: { itemStyle: { color: '#aaaab1', fontWeight: '500' }, itemHoverStyle: { color: '#fff' } },
    tooltip: { backgroundColor: '#18181b', borderColor: '#333338', style: { color: '#fff' } },
    xAxis: { lineColor: COLORS.grid, tickColor: COLORS.grid, labels: { style: { color: COLORS.muted } } },
    yAxis: { gridLineColor: COLORS.grid, title: { text: undefined }, labels: { style: { color: COLORS.muted } } },
  }), []);

  const checkpointChart = useMemo(() => ({
    ...baseChart, chart: { ...baseChart.chart, type: 'areaspline', height: 286 },
    xAxis: { ...baseChart.xAxis, categories: data.performance.map(x => x.name), labels: { ...baseChart.xAxis.labels, formatter() { return `${this.pos + 1}`; } } },
    yAxis: { ...baseChart.yAxis, min: 0, max: 100, labels: { ...baseChart.yAxis.labels, format: '{value}%' } },
    legend: { enabled: false },
    plotOptions: { areaspline: { lineWidth: 3, marker: { enabled: false }, fillColor: { linearGradient: [0,0,0,240], stops: [[0,'rgba(246,196,83,.38)'],[1,'rgba(246,196,83,0)']] } } },
    series: [{ name: 'Finalización', color: COLORS.gold, data: data.performance.map(x => x.value) }],
  }), [baseChart, data.performance]);

  const categoryChart = useMemo(() => ({
    ...baseChart, chart: { ...baseChart.chart, type: 'bar', height: 286 },
    xAxis: { ...baseChart.xAxis, categories: Object.keys(data.categories), tickLength: 0 },
    yAxis: { ...baseChart.yAxis, allowDecimals: false }, legend: { enabled: false },
    plotOptions: { bar: { borderWidth: 0, borderRadius: 5, pointWidth: 12 } },
    series: [{ name: 'Participantes', color: COLORS.gold, data: Object.values(data.categories) }],
  }), [baseChart, data.categories]);

  const terrainChart = useMemo(() => ({
    ...baseChart, chart: { ...baseChart.chart, type: 'pie', height: 230 },
    plotOptions: { pie: { innerSize: '72%', borderWidth: 0, dataLabels: { enabled: false }, showInLegend: true, colors: [COLORS.gold,'#5d8f7b','#72727a','#d97745'] } },
    series: [{ name: 'Checkpoints', data: Object.entries(data.terrain).map(([name, y]) => ({ name, y })) }],
  }), [baseChart, data.terrain]);

  if (user === undefined || !currentRoute?.id) return <Loading message="Preparando el espacio de tu ruta" />;

  return <>
    <Head><title>{route?.title ? `${route.title} · Tablero ejecutivo` : 'Tablero ejecutivo'}</title></Head>
    <ToastContainer theme="dark" />
    <main className="executive-dashboard">
      <div className="glow glow-one"/><div className="glow glow-two"/>
      <div className="dashboard-shell">
        <header className="dashboard-hero">
          <div>
            <div className="eyebrow"><span className="live-dot"/>Inteligencia de ruta</div>
            <h1>{route?.title || currentRoute.title || 'Ruta seleccionada'}</h1>
            <div className="route-meta"><span><FiCalendar/>{route?.dates || dateRange(route)}</span><span><FiMapPin/>{route?.venue || 'Sede por confirmar'}</span></div>
          </div>
          <div className="hero-actions"><div className="data-status"><FiActivity/>Datos de ruta en vivo</div><Link href="/routes" className="details-button">Administrar ruta <FiArrowRight/></Link></div>
        </header>

        {loading ? <Loading inline message="Preparando el análisis de la ruta"/> : !route ? <div className="empty-state">No hay datos disponibles para esta ruta.</div> : <>
          <section className="kpi-grid">
            <Metric icon={<FiUsers/>} label="Participantes registrados" value={compact.format(data.riderCount)} detail={`${data.activeRiders} participantes activos`} accent="gold"/>
            <Metric icon={<FiTrendingUp/>} label="Avance de la ruta" value={`${data.completion.toFixed(1)}%`} detail={`${compact.format(touches.length)} check-ins en total`} accent="green"/>
            <Metric icon={<FiFlag/>} label="Checkpoints" value={data.checkpointCount} detail={`${data.challengeCount} puntos de reto`} accent="blue"/>
            <Metric icon={<FiAward/>} label="Puntos otorgados" value={compact.format(data.totalPoints)} detail={`${compact.format(data.availablePoints)} posibles por participante`} accent="violet"/>
          </section>
          <section className="dashboard-grid">
            <article className="dashboard-card performance-card"><CardTitle eyebrow="Rendimiento" title="Participación por checkpoint" note="Porcentaje de avance según el orden de la ruta"/>{data.performance.length ? <HighchartsReact highcharts={Highcharts} options={checkpointChart}/> : <EmptyChart/>}</article>
            <article className="dashboard-card pulse-card"><CardTitle eyebrow="Estado" title="Actividad de la ruta" note="Resumen de participación en tiempo real"/><div className="completion-ring" style={{'--progress':`${Math.min(data.activeRate,100)*3.6}deg`}}><div><strong>{data.activeRate.toFixed(0)}%</strong><span>activos</span></div></div><div className="pulse-stats"><div><span>Participantes activos</span><strong>{data.activeRiders}</strong></div><div><span>Check-ins por persona</span><strong>{data.riderCount ? (touches.length/data.riderCount).toFixed(1) : '0'}</strong></div></div></article>
            <article className="dashboard-card category-card"><CardTitle eyebrow="Participantes" title="Categorías" note="Distribución de registros"/>{Object.keys(data.categories).length ? <HighchartsReact highcharts={Highcharts} options={categoryChart}/> : <EmptyChart/>}</article>
            <article className="dashboard-card terrain-card"><CardTitle eyebrow="Recorrido" title="Tipos de terreno" note={`${data.checkpointCount} checkpoints`}/>{Object.keys(data.terrain).length ? <HighchartsReact highcharts={Highcharts} options={terrainChart}/> : <EmptyChart/>}</article>
            <article className="dashboard-card leaderboard-card">
              <div className="leaderboard-heading"><CardTitle eyebrow="Clasificación" title="Mejores participantes" note="Ordenados por puntos acumulados"/><Link href={`/ranking/${currentRoute.id}`}>Ver clasificación <FiArrowRight/></Link></div>
              <div className="rider-table"><div className="rider-row rider-head"><span>Lugar y participante</span><span>Motocicleta</span><span>Categoría</span><span>Puntos</span></div>
                {data.top.length ? data.top.map((rider,index) => <div className="rider-row" key={rider.profile_id}><div className="rider-identity"><span className={`rank rank-${index+1}`}>{String(index+1).padStart(2,'0')}</span><span><strong>{rider.full_name || 'Sin nombre'}</strong><small>{index === 0 ? 'Líder actual' : 'Participante registrado'}</small></span></div><span className="muted-cell">{rider.motorcycle || '—'}</span><span><em>{categoryLabel(rider.category) || 'Abierta'}</em></span><strong className="points-cell">{compact.format(Number(rider.points || 0))}</strong></div>) : <div className="table-empty">Aún no hay actividad de participantes.</div>}
              </div>
            </article>
          </section>
          <footer className="dashboard-footer"><span><FiCheckCircle/>Sincronizado con las operaciones de ruta</span><span>Inteligencia ejecutiva NorthBikers</span></footer>
        </>}
      </div>
    </main>
    <style jsx>{styles}</style>
  </>;
}

function Metric({icon,label,value,detail,accent}) { return <article className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{detail}</small></article>; }
function CardTitle({eyebrow,title,note}) { return <div className="card-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div><small>{note}</small></div>; }
function EmptyChart() { return <div className="chart-empty">Los datos aparecerán cuando comience la actividad de la ruta.</div>; }
function Loading({message,inline=false}) { return <div className={inline?'dashboard-loading inline':'dashboard-loading'}><span/><p>{message}</p></div>; }
function dateRange(route) { if (!route?.start_timestamp) return 'Fecha por confirmar'; const start=new Date(route.start_timestamp).toLocaleDateString('es-MX',{month:'short',day:'numeric'}); const end=route.end_timestamp?new Date(route.end_timestamp).toLocaleDateString('es-MX',{month:'short',day:'numeric',year:'numeric'}):''; return end?`${start} — ${end}`:start; }

const styles = `
.executive-dashboard{position:relative;min-height:100%;overflow:hidden;background:#0a0a0b;color:#f5f1e8;padding:34px 30px 24px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.dashboard-shell{position:relative;z-index:1;max-width:1500px;margin:auto}.glow{position:absolute;border-radius:999px;filter:blur(100px);opacity:.12;pointer-events:none}.glow-one{width:420px;height:420px;background:#f6c453;top:-260px;right:10%}.glow-two{width:360px;height:360px;background:#4f7d69;bottom:10%;left:-260px}.dashboard-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:30px}.eyebrow,.card-heading>div>span{text-transform:uppercase;letter-spacing:.16em;font-size:10px;font-weight:700;color:#f6c453}.live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#6fbb93;box-shadow:0 0 0 5px rgba(111,187,147,.1);margin-right:9px}.dashboard-hero h1{font-family:Georgia,serif;font-size:clamp(34px,4vw,56px);font-weight:400;letter-spacing:-.035em;line-height:1.05;margin:10px 0 14px}.route-meta{display:flex;gap:24px;color:#9b9ba2;font-size:13px}.route-meta span,.hero-actions,.data-status,.details-button{display:flex;align-items:center;gap:8px}.hero-actions{gap:12px}.data-status,.details-button{border:1px solid #29292e;border-radius:999px;padding:10px 14px;font-size:12px}.data-status{color:#aaaab1;background:rgba(255,255,255,.02)}.details-button{background:#f2eadc;color:#111114;border-color:#f2eadc;font-weight:700;transition:.2s}.details-button:hover{background:#fff;transform:translateY(-1px)}.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}.metric-card,.dashboard-card{background:linear-gradient(145deg,rgba(22,22,25,.98),rgba(15,15,17,.98));border:1px solid #242429;box-shadow:0 18px 60px rgba(0,0,0,.18)}.metric-card{position:relative;overflow:hidden;border-radius:18px;padding:20px}.metric-card:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent);opacity:.75}.metric-gold{--accent:#f6c453}.metric-green{--accent:#64a987}.metric-blue{--accent:#658eb3}.metric-violet{--accent:#947eb0}.metric-top{display:flex;align-items:center;justify-content:space-between;color:#94949c;font-size:11px;text-transform:uppercase;letter-spacing:.1em}.metric-top i{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.045);color:var(--accent);font-size:15px}.metric-card>strong{display:block;font-family:Georgia,serif;font-size:35px;font-weight:400;letter-spacing:-.03em;margin:14px 0 3px}.metric-card>small{color:#6f6f77;font-size:11px}.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(280px,.75fr);gap:14px}.dashboard-card{border-radius:18px;padding:22px;min-width:0}.performance-card,.category-card,.pulse-card,.terrain-card{min-height:355px}.card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:16px}.card-heading h2{font-size:17px;margin:4px 0 0;font-weight:600}.card-heading>small{font-size:11px;color:#686870;margin-top:6px}.completion-ring{width:168px;height:168px;border-radius:50%;margin:22px auto 24px;background:conic-gradient(#f6c453 var(--progress),#25252a 0);position:relative;display:grid;place-items:center}.completion-ring:before{content:'';position:absolute;inset:11px;border-radius:50%;background:#121214;border:1px solid #29292e}.completion-ring>div{position:relative;text-align:center}.completion-ring strong{display:block;font-family:Georgia,serif;font-size:38px;font-weight:400}.completion-ring span{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:#818188}.pulse-stats{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #242429;padding-top:16px}.pulse-stats div+div{border-left:1px solid #242429;padding-left:18px}.pulse-stats span,.pulse-stats strong{display:block}.pulse-stats span{font-size:10px;color:#73737b;text-transform:uppercase}.pulse-stats strong{margin-top:5px;font-size:17px}.leaderboard-card{grid-column:1/-1}.leaderboard-heading{display:flex;align-items:flex-start;justify-content:space-between}.leaderboard-heading>a{display:flex;align-items:center;gap:7px;color:#f6c453;font-size:11px;margin-top:7px}.rider-row{display:grid;grid-template-columns:minmax(230px,1.6fr) minmax(150px,1fr) minmax(100px,.7fr) 80px;align-items:center;gap:16px;padding:13px 8px;border-top:1px solid #232328;font-size:12px}.rider-head{border:0;color:#5f5f67;font-size:9px;text-transform:uppercase;letter-spacing:.12em}.rider-head span:last-child,.points-cell{text-align:right}.rider-identity{display:flex;align-items:center;gap:13px}.rider-identity>span:last-child{display:flex;flex-direction:column;gap:2px}.rider-identity small{color:#64646b;font-size:10px}.rank{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#222226;color:#8d8d94;font-family:Georgia,serif}.rank-1{background:rgba(246,196,83,.13);color:#f6c453;border:1px solid rgba(246,196,83,.22)}.muted-cell{color:#909097}.rider-row em{display:inline-block;border:1px solid #303036;border-radius:99px;padding:4px 9px;color:#aaaab0;font-style:normal;font-size:10px}.points-cell{color:#f6c453;font-size:14px}.table-empty,.chart-empty{display:grid;place-items:center;min-height:220px;color:#66666e;font-size:12px}.dashboard-footer{display:flex;justify-content:space-between;padding:18px 4px 0;color:#515158;font-size:9px;text-transform:uppercase;letter-spacing:.12em}.dashboard-footer span:first-child{display:flex;align-items:center;gap:7px}.dashboard-loading{min-height:70vh;background:#0a0a0b;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#777780;font-size:12px}.dashboard-loading.inline{min-height:420px;border:1px solid #242429;border-radius:18px;background:#111113}.dashboard-loading span{width:28px;height:28px;border:2px solid #29292e;border-top-color:#f6c453;border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px}.empty-state{padding:80px;text-align:center;border:1px solid #28282d;border-radius:18px;color:#96969d;background:#121214}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1024px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.leaderboard-card{grid-column:auto}}
@media(max-width:720px){.executive-dashboard{padding:24px 14px}.dashboard-hero{align-items:flex-start;flex-direction:column}.hero-actions{width:100%;justify-content:flex-end}.route-meta{flex-direction:column;gap:7px}.kpi-grid{grid-template-columns:1fr 1fr}.metric-card{padding:16px}.metric-card>strong{font-size:29px}.data-status{display:none}.rider-row{grid-template-columns:1fr 58px}.rider-row>*:nth-child(2),.rider-row>*:nth-child(3){display:none}.dashboard-footer span:last-child{display:none}}
@media(max-width:430px){.kpi-grid{grid-template-columns:1fr}.dashboard-hero h1{font-size:36px}.dashboard-card{padding:18px}.card-heading>small{display:none}}
`;
