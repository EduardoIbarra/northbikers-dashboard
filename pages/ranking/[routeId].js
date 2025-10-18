// pages/ranking/[routeId].js
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getSupabase } from '../../utils/supabase';

const AVATAR_FALLBACK = '/iso_nb_white.png?v=1';
const REFRESH_MS = 60_000;

const firstTwo = (s = '') => {
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(' ') || s;
};

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

  // ---------- Global styles (includes marker CSS + responsive row grid) ----------
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

      /* Marker CSS (pure CSS so Tailwind purge won't strip it) */
      .nbm { display:inline-flex; align-items:center; gap:8px; padding:2px 4px; }
      .nbm-avatar {
        width: 44px; height: 44px; aspect-ratio: 1 / 1;
        border-radius: 9999px; flex: none; display: block;
        background-color: #0b0f14;
        background-size: cover; background-position: center; background-repeat: no-repeat;
        box-shadow:
          0 0 0 2px rgba(34,211,238,.9),
          0 0 12px rgba(34,211,238,.45),
          inset 0 0 6px rgba(255,255,255,.25);
      }
      .nbm-name {
        color: #fff; font-weight: 700; font-size: 12px; line-height: 1;
        text-shadow: 0 1px 1px rgba(0,0,0,.8);
        background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.15);
        padding: 4px 6px; border-radius: 6px;
      }

      /* Responsive grid template for header + rows (more space to avatar+name on mobile) */
      .row-grid { display:grid; }
      @media (max-width: 640px) {
        .row-grid { grid-template-columns: 56px 44px 1fr 56px; }
      }
      @media (min-width: 640px) {
        .row-grid { grid-template-columns: 72px 84px 1fr 110px; }
      }
    `}</style>
  );

  // ---------- Data ----------
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
      .select('id,profile_id,route_id,points,participant_number,full_name,avatar_url,current_lat,current_lng')
      .eq('route_id', routeId)
      .gt('participant_number', 0);

    if (error) { console.error(error); setRows([]); setLoading(false); return; }

    const cleaned = (eps ?? []).map(p => ({
      ...p,
      points: Number(p.points ?? 0),
      full_name: firstTwo(p.full_name) ?? 'Sin nombre',
      participant_number: Number(p.participant_number ?? 0),
    }));

    // keep your current sort + rank
    cleaned.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.participant_number !== b.participant_number) return a.participant_number - b.participant_number;
      return a.full_name.localeCompare(firstTwo(b.full_name), 'es', { sensitivity: 'base' });
    });
    let last = null, pos = 0;
    cleaned.forEach((it, idx) => { if (last===null || it.points!==last){ pos = idx+1; last = it.points; } it.rank = pos; });

    setRows(cleaned);
    setLoading(false);
  }, [routeId, supabase]);

  // ---------- Visibility + refresh ----------
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

  // ---------- Load Leaflet (CDN) ----------
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

  // ---------- Map init (wait for non-zero height) ----------
  useEffect(() => {
    if (!leafletRef.current) return;
    if (mapRef.current) return;

    const tryInit = () => {
      const L = leafletRef.current;
      const el = document.getElementById('ranking-map');
      if (!el) return false;
      if (!el.clientHeight) return false;

      const m = L.map('ranking-map', { zoomControl: true, preferCanvas: true, detectRetina: true });
      mapRef.current = m;

      // Dark basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd'
      }).addTo(m);

      markersLayerRef.current = L.layerGroup().addTo(m);
      return true;
    };

    if (!tryInit()) {
      const i = setInterval(() => { if (tryInit()) clearInterval(i); }, 300);
      return () => clearInterval(i);
    }
  }, [leafletRef.current]);

  // ---------- Markers (perfectly round avatar bg + label) ----------
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
      const img = encodeURI(p.avatar_url || AVATAR_FALLBACK); // safe for inline url()
      const html = `
        <div class="nbm">
          <div class="nbm-avatar" style="background-image:url('${img}')"></div>
          <span class="nbm-name">${esc(firstTwo(p.full_name))}</span>
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
  const top3Ids = useMemo(() => new Set(rows.filter(r => r.rank <= 3).map(r => r.id)), [rows]);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <section className="rounded-2xl p-4 sm:p-5 nb-glass nb-card space-y-5">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end">
              {p2 ? (<PodiumCard place={2} data={p2} size="md" metal="silver" />) : <div />}
              {p1 ? (<PodiumCard place={1} data={p1} size="lg" metal="gold" />) : <div />}
              {p3 ? (<PodiumCard place={3} data={p3} size="md" metal="bronze" />) : <div />}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {/* Header aligns with row grid via .row-grid */}
              <div className="row-grid text-[11px] uppercase tracking-wide bg-white/5 text-gray-300">
                <div className="px-3 py-2">Pos</div>
                <div className="px-3 py-2">#</div>
                <div className="px-3 py-2">Participante</div>
                <div className="px-3 py-2 text-right">Puntos</div>
              </div>
              <ul className="divide-y divide-white/5">
                {([p1, p2, p3].filter(Boolean).length ? rest : rows).map(r => (
                  <RowItem key={r.id} r={r} />
                ))}
                {!rows.length && !loading && (
                  <li className="px-3 py-6 text-sm text-gray-400">No hay participantes con número asignado todavía.</li>
                )}
              </ul>
            </div>
          </section>

          {/* RIGHT: Map */}
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
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-gray-500">
        NorthBikers · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* --------------------- Subcomponents (unchanged UI except row layout tweaks) --------------------- */

function PodiumCard({ place, data, size = 'md', metal = 'gold' }) {
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null;
  const AVATAR_FALLBACK = '/iso_nb_white.png';
  const sizeMap = {
    lg: { wrap: 'py-4', avatar: 'w-20 h-20', name: 'text-base', points: 'text-xl', num: 'text-sm' },
    md: { wrap: 'py-3', avatar: 'w-16 h-16', name: 'text-sm', points: 'text-lg', num: 'text-xs' },
  };
  const s = sizeMap[size];
  const metalClass = metal === 'gold' ? 'nb-metal' : metal === 'silver' ? 'nb-metal-silver' : 'nb-metal-bronze';

  return (
    <div className={`rounded-xl ${metalClass} px-3 sm:px-4 ${s.wrap} text-center`}>
      <div className="text-xs uppercase tracking-wide text-gray-300 flex justify-center items-center gap-1 mb-2">
        <span className="font-black">#{data.rank}</span> {medal && <span>{medal}</span>}
      </div>
      <div className={`mx-auto rounded-full overflow-hidden ring-2 ring-white/30 ${s.avatar}`}>
        <img src={data.avatar_url || AVATAR_FALLBACK} alt={firstTwo(data.full_name)} className="w-full h-full object-cover" />
      </div>
      <div className="mt-2 font-semibold truncate">{firstTwo(data.full_name)}</div>
      <div className={`text-gray-300 ${s.num}`}>#{data.participant_number}</div>
      <div className={`mt-2 font-extrabold tabular-nums ${s.points}`}>{data.points}</div>
    </div>
  );
}

function RowItem({ r }) {
  const AVATAR_FALLBACK = '/iso_nb_white.png';
  return (
    <li className="row-grid items-center px-3 py-2 sm:py-3 bg-black/30 hover:bg-black/40 transition-colors">
      <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
        <span>#{r.rank}</span>
      </div>
      <div className="text-sm sm:text-base font-semibold text-gray-200">{r.participant_number}</div>

      {/* Avatar + name (more space on mobile, perfectly round avatar) */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-white/15 shrink-0">
          <img
            src={r.avatar_url || AVATAR_FALLBACK}
            alt={firstTwo(r.full_name)}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="leading-4 min-w-0">
          <div className="text-sm sm:text-base font-semibold truncate">{firstTwo(r.full_name)}</div>
          <div className="text-[10px] sm:text-xs text-gray-400">ID {r.profile_id?.slice(0, 8)}</div>
        </div>
      </div>

      <div className="text-right text-sm sm:text-base font-extrabold tabular-nums">{r.points}</div>
    </li>
  );
}
