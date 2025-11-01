// pages/routes/purchases.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../../utils/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const cents = (n) => (n ?? 0);
const centsToMoney = (c) => MXN.format(cents(c) / 100);

// Comisión: 7.2% + $3.00 MXN
const calcFeeCents = (amountCents) => Math.round(cents(amountCents) * 0.072) + 300;
// Descuento porcentual
const applyPercentDiscountCents = (amountCents, pct) => Math.round(cents(amountCents) * (pct / 100));

// --- CSV helpers ---
const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const downloadCSV = (rows, filename) => {
  const csv = rows.map((arr) => arr.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function RoutePurchasesPage() {
  const router = useRouter();
  const { routeId } = router.query;
  const supabase = getSupabase();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PRODUCTS'); // PRODUCTS | PARTICIPANTS
  const [rows, setRows] = useState([]); // productos “flat”
  const [routeTitle, setRouteTitle] = useState('');
  const [routePrices, setRoutePrices] = useState({ amount_cents: 0, couple_price_cents: 0 });
  const [participants, setParticipants] = useState([]);

  // ---------- Fetch principal ----------
  const fetchAll = async (rId) => {
    try {
      setLoading(true);

      // 1) Ruta con precios
      const { data: routeRow, error: routeErr } = await supabase
        .from('routes')
        .select('id, title, amount, couple_price')
        .eq('id', rId)
        .maybeSingle();
      if (routeErr) throw routeErr;

      setRouteTitle(routeRow?.title ?? `Ruta #${rId}`);
      setRoutePrices({
        amount_cents: Math.round((routeRow?.amount ?? 0) * 100),
        couple_price_cents: Math.round((routeRow?.couple_price ?? 0) * 100),
      });

      // 2) Compras de productos — SOLO de esta ruta
      //   Clave: usar INNER JOIN en event_profile y filtrar por route_id
      const { data, error } = await supabase
        .from('event_profile_product')
        .select(`
          id, quantity, unit_price_cents, notes, created_at,
          product:products ( id, title, price_cents, pictures_csv ),
          event_profile!inner (
            id, route_id,
            profile:profiles ( id, name, email, avatar_url, city, bike )
          )
        `)
        .eq('event_profile.route_id', rId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const flat = (data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        quantity: row.quantity,
        unit_price_cents: row.unit_price_cents,
        notes: row.notes || '',
        product_id: row.product?.id ?? null,
        product_title: row.product?.title ?? '(Producto)',
        product_price_cents: row.product?.price_cents ?? null,
        pictures_csv: row.product?.pictures_csv ?? null,
        event_profile_id: row.event_profile?.id ?? null,
        profile_id: row.event_profile?.profile?.id ?? null,
        name: row.event_profile?.profile?.name ?? '(sin nombre)',
        email: row.event_profile?.profile?.email ?? '',
        city: row.event_profile?.profile?.city ?? '',
        bike: row.event_profile?.profile?.bike ?? '',
        avatar_url: row.event_profile?.profile?.avatar_url ?? '',
      }));
      setRows(flat);

      // 3) Participantes
      await fetchParticipants(rId, routeRow);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (rId, routeRow) => {
    try {
      const { data: eps, error } = await supabase
        .from('event_profile')
        .select(`
          id, created_at, updated_at, profile_id,
          participant_number, is_couple, referrer, coupon_code,
          stripe_webhook_email_notification
        `)
        .eq('route_id', rId)
        .gt('participant_number', 0)
        .order('participant_number', { ascending: true });
      if (error) throw error;

      const profileIds = (eps ?? []).map((x) => x.profile_id).filter(Boolean);
      let profilesById = {};
      if (profileIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', profileIds);
        profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      }

      const couponCodes = Array.from(new Set((eps ?? []).map((x) => x.coupon_code).filter(Boolean)));
      let couponsByCode = {};
      if (couponCodes.length) {
        const { data: coupons } = await supabase
          .from('coupons')
          .select('code, discount_percentage')
          .in('code', couponCodes);
        couponsByCode = Object.fromEntries((coupons ?? []).map((c) => [c.code, c]));
      }

      const mapped = (eps ?? []).map((ep) => {
        const profile = profilesById[ep.profile_id] || {};
        const coupon = ep.coupon_code ? couponsByCode[ep.coupon_code] : null;
        const discountPct = coupon?.discount_percentage ?? 0;

        const baseCents = ep.is_couple
          ? Math.round((routeRow?.couple_price ?? 0) * 100)
          : Math.round((routeRow?.amount ?? 0) * 100);

        const couponDiscountCents = applyPercentDiscountCents(baseCents, discountPct);
        const baseAfterDiscountCents = Math.max(baseCents - couponDiscountCents, 0);

        // FEE SE RESTA (neto)
        const feeCents = calcFeeCents(baseAfterDiscountCents);
        const totalPayableCents = baseAfterDiscountCents - feeCents;

        return {
          ep,
          profile,
          coupon,
          baseCents,
          couponDiscountCents,
          feeCents,
          totalPayableCents, // neto
        };
      });

      setParticipants(mapped);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando participantes');
    }
  };

  useEffect(() => {
    if (!routeId) return;
    fetchAll(routeId);
  }, [routeId]);

  // ---------- Agrupaciones & Totales (PRODUCTOS) ----------
  const groupedByUser = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.profile_id || `ep:${r.event_profile_id}`;
      if (!map.has(key)) map.set(key, { profileKey: key, user: r, lines: [] });
      map.get(key).lines.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const summaryByProduct = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const title = r.product_title || '(Producto)';
      const qty = cents(r.quantity);
      const lineSubtotal = qty * cents(r.unit_price_cents);
      const fee = calcFeeCents(lineSubtotal);
      const prev = map.get(title) || { qty: 0, subtotal: 0, fees: 0, totalNeto: 0 };
      prev.qty += qty;
      prev.subtotal += lineSubtotal;
      prev.fees += fee;
      prev.totalNeto += lineSubtotal - fee; // NETO (restando fee)
      map.set(title, prev);
    }
    return Array.from(map.entries()).map(([title, v]) => ({ title, ...v }));
  }, [rows]);

  const totalsProducts = useMemo(() => {
    let subtotal = 0, fees = 0;
    for (const r of rows) {
      const lineSubtotal = cents(r.quantity) * cents(r.unit_price_cents);
      subtotal += lineSubtotal;
      fees += calcFeeCents(lineSubtotal);
    }
    return { subtotal, fees, totalNeto: subtotal - fees }; // NETO
  }, [rows]);

  // ---------- Totales (PARTICIPANTES) ----------
  const totalsParticipants = useMemo(() => {
    let base = 0, disc = 0, afterDisc = 0, fees = 0, totalNeto = 0;
    for (const p of participants) {
      base += cents(p.baseCents);
      disc += cents(p.couponDiscountCents);
      const after = cents(p.baseCents) - cents(p.couponDiscountCents);
      afterDisc += after;
      fees += cents(p.feeCents);
      totalNeto += cents(p.totalPayableCents); // ya es neto
    }
    return { base, disc, afterDisc, fees, totalNeto };
  }, [participants]);

  // ---------- Total Global ----------
  const totalsGlobal = useMemo(() => ({
    totalNeto: totalsProducts.totalNeto + totalsParticipants.totalNeto,
    fees: totalsProducts.fees + totalsParticipants.fees,
  }), [totalsProducts, totalsParticipants]);

  // ---------- Export CSV (PARTICIPANTES, neto) ----------
  const downloadCSVParticipants = () => {
    const header = [
      'Nombre','Referrer','Participante','Cupón','Descuento%',
      'Ticket Base (MXN)','Descuento (MXN)','Base - Desc (MXN)',
      'Fee (MXN)','Total Neto (MXN)','Es Pareja',
    ];
    const body = participants.map((p) => [
      p.profile?.name ?? '(sin nombre)',
      p.ep?.referrer ?? '',
      p.ep?.participant_number ?? '',
      p.coupon?.code ?? '',
      p.coupon?.discount_percentage ?? 0,
      (cents(p.baseCents) / 100).toFixed(2),
      (cents(p.couponDiscountCents) / 100).toFixed(2),
      ((cents(p.baseCents) - cents(p.couponDiscountCents)) / 100).toFixed(2),
      (cents(p.feeCents) / 100).toFixed(2),
      (cents(p.totalPayableCents) / 100).toFixed(2),
      p.ep?.is_couple ? 'Sí' : 'No',
    ]);
    downloadCSV([header, ...body], `participantes_route_${routeId}.csv`);
  };

  // ---------- Export CSV (PRODUCTOS, detalle por línea con neto) ----------
  const downloadCSVProducts = () => {
    const header = [
      'Fecha','Producto','Cantidad','Unitario (MXN)','Subtotal (MXN)',
      'Fee (MXN)','Total Neto (MXN)','Notas',
      'Nombre','Email','Ciudad','Moto',
      'product_id','event_profile_id','profile_id','purchase_id'
    ];
    const body = rows.map((r) => {
      const qty = cents(r.quantity);
      const unit = cents(r.unit_price_cents);
      const lineSubtotal = qty * unit;
      const fee = calcFeeCents(lineSubtotal);
      const neto = lineSubtotal - fee;
      return [
        new Date(r.created_at).toLocaleString('es-MX'),
        r.product_title,
        qty,
        (unit / 100).toFixed(2),
        (lineSubtotal / 100).toFixed(2),
        (fee / 100).toFixed(2),
        (neto / 100).toFixed(2),
        r.notes || '',
        r.name || '',
        r.email || '',
        r.city || '',
        r.bike || '',
        r.product_id ?? '',
        r.event_profile_id ?? '',
        r.profile_id ?? '',
        r.id ?? '',
      ];
    });
    downloadCSV([header, ...body], `productos_route_${routeId}.csv`);
  };

  const handleExportActiveTab = () => {
    if (activeTab === 'PRODUCTS') downloadCSVProducts();
    else downloadCSVParticipants();
  };

  return (
    <>
      <Head><title>Compras — NorthBikers</title></Head>
      <ToastContainer />
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Compras</h1>
              <p className="text-sm text-gray-300">
                Ruta: <span className="font-semibold">{routeTitle}</span> — ID: {routeId}
              </p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'PRODUCTS' && (
                <button
                  onClick={downloadCSVProducts}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  Exportar CSV (Productos)
                </button>
              )}
              {activeTab === 'PARTICIPANTS' && (
                <button
                  onClick={downloadCSVParticipants}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  Exportar CSV (Participantes)
                </button>
              )}
              <Link href="/routes" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                Volver a Rutas
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 inline-flex rounded-lg overflow-hidden border border-gray-700">
            <button
              className={`px-4 py-2 text-sm ${activeTab==='PRODUCTS' ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('PRODUCTS')}
            >
              Productos
            </button>
            <button
              className={`px-4 py-2 text-sm ${activeTab==='PARTICIPANTS' ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('PARTICIPANTS')}
            >
              Participantes
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-300">Cargando…</div>
          ) : activeTab === 'PARTICIPANTS' ? (
            // ======= PARTICIPANTES =======
            participants.length === 0 ? (
              <div className="p-8 text-center text-gray-300">No hay participantes.</div>
            ) : (
              <>
                {/* Totales Participantes */}
                <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4 grid sm:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-gray-300">Base</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.base)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">Descuentos</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.disc)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">Base - Desc</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.afterDisc)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">Comisiones</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.fees)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">Total neto</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.totalNeto)}</div>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700 flex justify-between">
                    <div className="font-semibold">Participantes</div>
                    <div className="text-sm text-gray-300">
                      Individual: {centsToMoney(routePrices.amount_cents)} | Pareja: {centsToMoney(routePrices.couple_price_cents)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="text-left px-4 py-2">Nombre</th>
                          <th className="text-left px-4 py-2">Referrer</th>
                          <th className="text-left px-4 py-2">Participante</th>
                          <th className="text-left px-4 py-2">Cupón</th>
                          <th className="text-right px-4 py-2">Ticket base</th>
                          <th className="text-right px-4 py-2">Descuento</th>
                          <th className="text-right px-4 py-2">Base - Desc</th>
                          <th className="text-right px-4 py-2">Fee</th>
                          <th className="text-right px-4 py-2">Total neto</th>
                          <th className="text-center px-4 py-2">Pareja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((p) => (
                          <tr key={p.ep.id} className="border-t border-gray-700">
                            <td className="px-4 py-2">{p.profile?.name ?? '(sin nombre)'}</td>
                            <td className="px-4 py-2">{p.ep?.referrer ?? ''}</td>
                            <td className="px-4 py-2">{p.ep?.participant_number ?? ''}</td>
                            <td className="px-4 py-2">{p.coupon ? `${p.coupon.code} (${p.coupon.discount_percentage}%)` : '—'}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.baseCents)}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.couponDiscountCents)}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.baseCents - p.couponDiscountCents)}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.feeCents)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{centsToMoney(p.totalPayableCents)}</td>
                            <td className="px-4 py-2 text-center">{p.ep?.is_couple ? 'Sí' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          ) : (
            // ======= PRODUCTOS =======
            rows.length === 0 ? (
              <div className="p-8 text-center text-gray-300">No hay compras de productos.</div>
            ) : (
              <>
                {/* Totales Productos + Global */}
                <div className="mb-6 grid sm:grid-cols-5 gap-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-300">Productos — Subtotal</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsProducts.subtotal)}</div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-300">Productos — Comisiones</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsProducts.fees)}</div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-300">Productos — Total neto</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsProducts.totalNeto)}</div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-300">Participantes — Total neto</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsParticipants.totalNeto)}</div>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="text-sm text-gray-300">Global — Total neto</div>
                    <div className="text-2xl font-semibold">{centsToMoney(totalsGlobal.totalNeto)}</div>
                    <div className="text-xs text-gray-400 mt-1">*Comisiones restadas en ambos</div>
                  </div>
                </div>

                {/* Resumen por producto */}
                <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700 font-semibold">Resumen por producto</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="text-left px-4 py-2">Producto</th>
                          <th className="text-right px-4 py-2">Cantidad</th>
                          <th className="text-right px-4 py-2">Subtotal</th>
                          <th className="text-right px-4 py-2">Comisiones</th>
                          <th className="text-right px-4 py-2">Total neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryByProduct.map((p) => (
                          <tr key={p.title} className="border-t border-gray-700">
                            <td className="px-4 py-2">{p.title}</td>
                            <td className="px-4 py-2 text-right">{p.qty}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.subtotal)}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.fees)}</td>
                            <td className="px-4 py-2 text-right">{centsToMoney(p.totalNeto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detalle por usuario */}
                <div className="space-y-6">
                  {groupedByUser.map(({ profileKey, user, lines }) => {
                    return (
                      <div key={profileKey} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-700" />
                            )}
                            <div>
                              <div className="font-semibold">{user.name}</div>
                              <div className="text-xs text-gray-300">{user.email}</div>
                              <div className="text-xs text-gray-400">{user.city}{user.bike ? ` • ${user.bike}` : ''}</div>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-700/50">
                              <tr>
                                <th className="text-left px-4 py-2">Fecha</th>
                                <th className="text-left px-4 py-2">Producto</th>
                                <th className="text-right px-4 py-2">Cantidad</th>
                                <th className="text-right px-4 py-2">Unitario</th>
                                <th className="text-right px-4 py-2">Subtotal</th>
                                <th className="text-right px-4 py-2">Fee</th>
                                <th className="text-right px-4 py-2">Total neto</th>
                                <th className="text-left px-4 py-2">Notas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((r) => {
                                const lineSubtotal = cents(r.quantity) * cents(r.unit_price_cents);
                                const fee = calcFeeCents(lineSubtotal);
                                const finalNeto = lineSubtotal - fee; // NETO
                                return (
                                  <tr key={r.id} className="border-t border-gray-700">
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-MX')}</td>
                                    <td className="px-4 py-2">{r.product_title}</td>
                                    <td className="px-4 py-2 text-right">{r.quantity}</td>
                                    <td className="px-4 py-2 text-right">{centsToMoney(r.unit_price_cents)}</td>
                                    <td className="px-4 py-2 text-right">{centsToMoney(lineSubtotal)}</td>
                                    <td className="px-4 py-2 text-right">{centsToMoney(fee)}</td>
                                    <td className="px-4 py-2 text-right">{centsToMoney(finalNeto)}</td>
                                    <td className="px-4 py-2">{r.notes}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {/* Footer: total global neto (visible siempre) */}
          {!loading && (
            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-300">Total global neto (Productos + Participantes)</div>
              <div className="text-2xl font-semibold">{centsToMoney(totalsGlobal.totalNeto)}</div>
              <div className="text-xs text-gray-400">Comisiones ya restadas. Total de comisiones: {centsToMoney(totalsGlobal.fees)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
