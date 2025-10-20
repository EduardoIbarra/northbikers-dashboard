// pages/ranking/[routeId].js
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getSupabase } from '../../utils/supabase';

const AVATAR_FALLBACK = '/iso_nb_white.png';
const BRAND_FALLBACK = 'https://www.svgrepo.com/show/308300/motorcycle-race-fast-motorbike.svg';
const REFRESH_MS = 60_000;

// ---------- helpers ----------
const firstTwo = (s = '') => {
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(' ') || s;
};
const isFiniteNum = (n) => Number.isFinite(n) && !Number.isNaN(n);
const toMs = (d) => (d ? new Date(d).getTime() : NaN);
const hasBoth = (a, b) => a != null && b != null;

// hh:mm:ss (sin ms), siempre con ceros
const fmtHHMMSS = (ms) => {
  if (!isFiniteNum(ms) || ms < 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const fmtKm = (km) => (isFiniteNum(km) ? String(Math.max(0, Math.round(km))) : '—');
const resolveBrandIcon = (brandField) => {
  if (!brandField) return BRAND_FALLBACK;
  try {
    const u = new URL(String(brandField));
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (_e) {}
  return BRAND_FALLBACK;
};

// misma plantilla de columnas (POS | MARCA | PARTICIPANTE | KM | TIEMPO | PUNTOS)
const GRID_COLS = '70px 70px 1fr 100px 140px 90px';

export default function PublicRouteRankingPage() {
  const supabase = useRef(getSupabase()).current;
  const router = useRouter();
  const { routeId } = router.query || {};

  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(null);
  const [rows, setRows] = useState([]);

  // Leaflet
  const leafletRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);

  // timers/visibility
  const intervalRef = useRef(null);
  const pageVisibleRef = useRef(true);

  // ---------- global styles ----------
  const GlobalStyles = () => (
    <style jsx global>{`
      body {
        background:
          radial-gradient(900px 500px at 10% -10%, rgba(148,163,184,.10), transparent 60%),
          radial-gradient(800px 400px at 90% 20%, rgba(59,130,246,.08), transparent 60%),
          #0b0f14;
        color:#e5e7eb;
      }
      .nb-glass { background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03)); backdrop-filter: blur(8px); }
      .nb-card  { border:1px solid rgba(255,255,255,.10); }

      .nb-metal {
        background-image:
          radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,.20), rgba(255,255,255,0) 60%),
          linear-gradient(135deg, #2b2f36, #1b1f25 35%, #2a2e34 60%, #171b21);
        border: 1px solid rgba(255,255,255,.18);
      }
      .nb-metal-silver {
        background-image:
          radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,.22), rgba(255,255,255,0) 60%),
          linear-gradient(135deg, #5f6670, #2a2f36 40%, #424852 70%, #1b1f25);
        border: 1px solid rgba(229,231,235,.18);
      }
      .nb-metal-bronze {
        background-image:
          radial-gradient(120% 70% at 50% 0%, rgba(255,240,220,.20), rgba(255,255,255,0) 60%),
          linear-gradient(135deg, #6a4b2d, #2d2218 40%, #513b26 70%, #1a1410);
        border: 1px solid rgba(250,204,170,.20);
      }
      .leaflet-container { background:#0b0f14; }
    `}</style>
  );

  // ---------- data ----------
  const loadData = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);

    const { data: routes } = await supabase
      .from('routes')
      .select('id,title,dates,banner,slug')
      .eq('id', routeId).limit(1);
    setRoute(routes?.[0] ?? null);

    const { data: eps, error } = await supabase
      .from('event_profile')
      .select(`
        id,profile_id,route_id,points,full_name,avatar_url,
        current_lat,current_lng,
        odo_start,odo_end,first_check_in_at,last_check_in_at,
        motorcycle_brand
      `)
      .eq('route_id', routeId)
      .gt('participant_number', 0);

    if (error) { console.error(error); setRows([]); setLoading(false); return; }

    const cleaned = (eps ?? []).map(p => {
      const km = hasBoth(p.odo_start, p.odo_end)
        ? Number(p.odo_end) - Number(p.odo_start)
        : NaN;

      const finishTs = toMs(p.last_check_in_at); // criterio de desempate oficial
      return {
        ...p,
        points: Number(p.points ?? 0),
        full_name: firstTwo(p.full_name) || 'Sin nombre',
        total_km: isFiniteNum(km) ? km : NaN,
        _finish_ts: isFiniteNum(finishTs) ? finishTs : Infinity, // si no tiene odómetro final, al final del desempate
        brand_icon: resolveBrandIcon(p.motorcycle_brand),
      };
    });

    // ORDEN OFICIAL: 1) puntos DESC  2) last_check_in_at ASC (quien termina antes gana)
    cleaned.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a._finish_ts !== b._finish_ts) return a._finish_ts - b._finish_ts;
      return a.full_name.localeCompare(b.full_name, 'es', { sensitivity: 'base' });
    });

    // rank secuencial
    cleaned.forEach((it, idx) => { it.rank = idx + 1; });

    setRows(cleaned);
    setLoading(false);
  }, [routeId, supabase]);

  // ---------- refresh & visibility ----------
  useEffect(() => {
    const onVis = () => {
      pageVisibleRef.current = document.visibilityState === 'visible';
      if (pageVisibleRef.current) loadData();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadData]);

  useEffect(() => {
    if (!routeId) return;
    loadData();
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => { if (pageVisibleRef.current) loadData(); }, REFRESH_MS);
    }
    return () => { clearInterval(intervalRef.current); intervalRef.current = null; };
  }, [routeId, loadData]);

  // ---------- Leaflet (CDN) ----------
  useEffect(() => {
    const ensureLeaflet = async () => {
      if (typeof window === 'undefined') return;
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        css.crossOrigin = '';
        document.head.appendChild(css);
      }
      if (window.L) { leafletRef.current = window.L; return; }
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        s.crossOrigin = '';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
      leafletRef.current = window.L;
    };
    ensureLeaflet();
  }, []);

  // ---------- map init ----------
  useEffect(() => {
    if (!leafletRef.current) return;
    if (mapRef.current) return;

    const L = leafletRef.current;
    const el = document.getElementById('ranking-map');
    if (!el || !el.clientHeight) return;

    const m = L.map('ranking-map', { zoomControl: true, preferCanvas: true, detectRetina: true });
    mapRef.current = m;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd'
    }).addTo(m);
    markersLayerRef.current = L.layerGroup().addTo(m);
  }, [leafletRef.current]);

  // ---------- markers ----------
  useEffect(() => {
    if (!leafletRef.current || !mapRef.current) return;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const pts = rows.filter(p => Number.isFinite(p.current_lat) && Number.isFinite(p.current_lng));
    if (!pts.length) {
      mapRef.current.setView([25.6866, -100.3161], 10);
      return;
    }

    const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const bounds = L.latLngBounds([]);

    pts.forEach(p => {
      const img = encodeURI(p.avatar_url || AVATAR_FALLBACK);
      const html = `
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-full ring-2 ring-cyan-400 overflow-hidden">
            <img src="${img}" alt="${esc(firstTwo(p.full_name))}" style="width:100%;height:100%;object-fit:cover"/>
          </div>
          <span class="text-xs font-semibold text-white">${esc(firstTwo(p.full_name))}</span>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'leaflet-plain-icon', iconSize: [0, 0] });
      L.marker([p.current_lat, p.current_lng], { icon }).addTo(layer);
      bounds.extend([p.current_lat, p.current_lng]);
    });

    mapRef.current.fitBounds(bounds.pad(0.2));
  }, [rows]);

  // ---------- UI ----------
  const [p1, p2, p3, ...rest] = rows;

  // líder por finish time (odómetro final)
  const leaderFinishMs = useMemo(() => rows[0]?._finish_ts ?? NaN, [rows]);

  return (
    <div className="min-h-screen">
      <GlobalStyles />
      <Head>
        <title>{route ? `${route.title} · Ranking` : 'Ranking'}</title>
        <meta name="robots" content="index,follow" />
      </Head>

      <header className="px-4 sm:px-6 py-5 border-b border-white/10 nb-glass">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <img src="/logo_nb_white.png" alt="NorthBikers" className="w-10 h-10 object-contain flex-none" style={{minWidth:40,minHeight:40}}/>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide truncate">{route?.title ?? 'Evento'}</h1>
            {route?.dates && <p className="text-xs text-gray-300/80">{route.dates}</p>}
          </div>
          <div className="ml-auto text-[11px] text-gray-400">Auto-refresh 1 min</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && <div className="animate-pulse text-sm text-gray-400 mb-3">Cargando ranking…</div>}

        {/* 1 columna: mapa debajo también en desktop */}
        <section className="rounded-2xl p-4 sm:p-5 nb-glass nb-card space-y-5 mb-6">
          <h2 className="text-lg font-semibold">Leaderboard</h2>

          {/* Podio */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
            {p2 ? (<PodiumCard place={2} data={p2} leaderFinishMs={leaderFinishMs} size="md" metal="silver" />) : <div />}
            {p1 ? (<PodiumCard place={1} data={p1} leaderFinishMs={leaderFinishMs} size="lg" metal="gold" />) : <div />}
            {p3 ? (<PodiumCard place={3} data={p3} leaderFinishMs={leaderFinishMs} size="md" metal="bronze" />) : <div />}
          </div>

          {/* Tabla */}
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="grid text-[11px] uppercase tracking-wide bg-white/5 text-gray-300"
                 style={{ gridTemplateColumns: GRID_COLS }}>
              <div className="px-3 py-2">Pos</div>
              <div className="px-3 py-2">Marca</div>
              <div className="px-3 py-2">Participante</div>
              <div className="px-3 py-2 text-right">KM</div>
              <div className="px-3 py-2 text-right">Tiempo</div>
              <div className="px-3 py-2 text-right">Puntos</div>
            </div>
            <ul className="divide-y divide-white/5">
              {([p1, p2, p3].filter(Boolean).length ? rest : rows).map(r => (
                <RowItem key={r.id} r={r} leaderFinishMs={leaderFinishMs} />
              ))}
              {!rows.length && !loading && (
                <li className="px-3 py-6 text-sm text-gray-400">No hay participantes todavía.</li>
              )}
            </ul>
          </div>
        </section>

        {/* Mapa */}
        <section className="rounded-2xl nb-glass nb-card">
          <div className="px-4 pt-4">
            <h2 className="text-lg font-semibold mb-3">Mapa (última ubicación)</h2>
          </div>
          <div
            id="ranking-map"
            className="w-full rounded-b-2xl overflow-hidden border-t border-white/10"
            style={{
              height: '520px',
              background: 'radial-gradient(60% 70% at 50% 30%, rgba(59,130,246,.08), transparent 60%), #0b0f14',
            }}
          />
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-gray-500">
        NorthBikers · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* --------------------- Subcomponents --------------------- */

function PodiumCard({ place, data, leaderFinishMs, size = 'md', metal = 'gold' }) {
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null;
  const sizeMap = {
    lg: { wrap: 'py-4', avatar: 'w-20 h-20', name: 'text-base', points: 'text-xl', num: 'text-sm', brand: 'w-6 h-6' },
    md: { wrap: 'py-3', avatar: 'w-16 h-16', name: 'text-sm', points: 'text-lg', num: 'text-xs', brand: 'w-5 h-5' },
  };
  const s = sizeMap[size];
  const metalClass = metal === 'gold' ? 'nb-metal' : metal === 'silver' ? 'nb-metal-silver' : 'nb-metal-bronze';

  // Podio: 1º Interval, 2º/3º +diferencia vs finish del líder
  const hasFinish = isFiniteNum(data._finish_ts) && isFiniteNum(leaderFinishMs);
  const timeText = place === 1
    ? 'Interval'
    : (hasFinish ? `+${fmtHHMMSS(data._finish_ts - leaderFinishMs)}` : '+00:00:00');

  const kmText = fmtKm(isFiniteNum(data.total_km) ? data.total_km : NaN);

  return (
    <div className={`rounded-xl ${metalClass} px-3 sm:px-4 ${s.wrap} text-center`}>
      <div className="text-xs uppercase tracking-wide text-gray-300 flex justify-center items-center gap-1 mb-2">
        <span className="font-black">#{data.rank}</span> {medal && <span>{medal}</span>}
      </div>
      <div className={`mx-auto rounded-full overflow-hidden ring-2 ring-white/30 ${s.avatar}`}>
        <img src={data.avatar_url || AVATAR_FALLBACK} alt={firstTwo(data.full_name)} className="w-full h-full object-cover" />
      </div>
      <div className="mt-2 font-semibold truncate flex items-center justify-center gap-2">
        <img src={data.brand_icon} alt="marca" className={`${s.brand} object-contain opacity-90`} />
        <span>{firstTwo(data.full_name)}</span>
      </div>
      <div className={`mt-2 font-extrabold tabular-nums ${s.points}`}>{data.points}</div>
      <div className="mt-1 text-[11px] text-gray-300/90 tabular-nums">
        <span className="mr-2">KM: <b>{kmText}</b></span>
        <span>Tiempo: <b>{timeText}</b></span>
      </div>
    </div>
  );
}

function RowItem({ r, leaderFinishMs }) {
  const kmText = fmtKm(isFiniteNum(r.total_km) ? r.total_km : NaN);

  // Tabla: 1º => "Interval"; demás => +diferencia vs finish del líder
  let timeText = 'Interval';
  if (r.rank !== 1) {
    const diff = (isFiniteNum(r._finish_ts) && isFiniteNum(leaderFinishMs))
      ? (r._finish_ts - leaderFinishMs)
      : NaN;
    timeText = isFiniteNum(diff) && diff > 0 ? `+${fmtHHMMSS(diff)}` : '+00:00:00';
  }

  return (
    <li
      className="grid items-center px-3 py-3 bg-black/30 hover:bg-black/40 transition-colors"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      {/* POS */}
      <div className="text-base sm:text-lg font-black tracking-tight">#{r.rank}</div>

      {/* MARCA */}
      <div className="flex items-center justify-center">
        <img src={r.brand_icon} alt="marca" className="w-6 h-6 object-contain opacity-90" />
      </div>

      {/* PARTICIPANTE (sin avatar) */}
      <div className="min-w-0">
        <div className="text-sm sm:text-base font-semibold truncate">{firstTwo(r.full_name)}</div>
        <div className="text-[10px] sm:text-xs text-gray-400">ID {String(r.profile_id || '').slice(0, 8)}</div>
      </div>

      {/* KM */}
      <div className="text-right text-sm sm:text-base font-semibold tabular-nums">{kmText}</div>

      {/* TIEMPO */}
      <div className="text-right text-sm sm:text-base font-semibold tabular-nums">{timeText}</div>

      {/* PUNTOS */}
      <div className="text-right text-sm sm:text-base font-extrabold tabular-nums">{r.points}</div>
    </li>
  );
}
