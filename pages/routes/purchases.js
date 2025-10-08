// pages/routes/purchases.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../../utils/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function centsToMoney(cents) {
  if (cents == null) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
}

export default function RoutePurchasesPage() {
  const router = useRouter();
  const { routeId } = router.query;

  const supabase = getSupabase();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // filas “flatt” con compra + usuario + producto
  const [routeTitle, setRouteTitle] = useState('');

  // ---------- Fetch principal (con relaciones) ----------
  const fetchAll = async (rId) => {
    try {
      setLoading(true);

      // 1) Trae info de la ruta (solo para encabezado)
      const { data: routeRow } = await supabase
        .from('routes')
        .select('id,title')
        .eq('id', rId)
        .maybeSingle();

      setRouteTitle(routeRow?.title ?? `Ruta #${rId}`);

      // 2) Intenta traer compras + producto + perfil usando relaciones
      const { data, error } = await supabase
        .from('event_profile_product')
        .select(`
          id, quantity, unit_price_cents, notes, created_at,
          product:products ( id, title, price_cents, pictures_csv ),
          event_profile:event_profile (
            id,
            route_id,
            profile:profiles ( id, name, email, avatar_url, city, bike )
          )
        `)
        .eq('event_profile.route_id', rId)
        .order('created_at', { ascending: true });

      if (error) {
        // Si truena por relaciones, hacemos el Plan B (dos pasos)
        console.warn('Fallo join directo, se intenta Plan B:', error);
        await fetchAllPlanB(rId);
        return;
      }

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
    } catch (e) {
      console.error(e);
      toast.error('Error cargando compras');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Plan B: Fetch en dos pasos por si no existen relaciones configuradas ----------
  const fetchAllPlanB = async (rId) => {
    try {
      // 1) Traer event_profiles del route
      const { data: eps, error: epErr } = await supabase
        .from('event_profile')
        .select('id, route_id, profile_id')
        .eq('route_id', rId);

      if (epErr) throw epErr;

      const epIds = (eps ?? []).map((x) => x.id);
      const profileIds = (eps ?? []).map((x) => x.profile_id);

      if (epIds.length === 0) {
        setRows([]);
        return;
      }

      // 2) Compras por esos EPs
      const { data: epps, error: eppErr } = await supabase
        .from('event_profile_product')
        .select('id, event_profile_id, product_id, quantity, unit_price_cents, notes, created_at')
        .in('event_profile_id', epIds)
        .order('created_at', { ascending: true });

      if (eppErr) throw eppErr;

      // 3) Trae productos
      const productIds = Array.from(new Set((epps ?? []).map((x) => x.product_id).filter(Boolean)));
      let productsById = {};
      if (productIds.length) {
        const { data: products, error: prodErr } = await supabase
          .from('products')
          .select('id, title, price_cents, pictures_csv')
          .in('id', productIds);
        if (prodErr) throw prodErr;
        productsById = Object.fromEntries((products ?? []).map((p) => [p.id, p]));
      }

      // 4) Trae perfiles
      let profilesById = {};
      if (profileIds.length) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, city, bike')
          .in('id', profileIds);
        if (profErr) throw profErr;
        profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      }

      // 5) EP → profile
      const epToProfile = Object.fromEntries((eps ?? []).map((x) => [x.id, x.profile_id]));

      const flat = (epps ?? []).map((row) => {
        const product = productsById[row.product_id] || {};
        const profile = profilesById[epToProfile[row.event_profile_id]] || {};
        return {
          id: row.id,
          created_at: row.created_at,
          quantity: row.quantity,
          unit_price_cents: row.unit_price_cents,
          notes: row.notes || '',
          product_id: row.product_id,
          product_title: product.title ?? '(Producto)',
          product_price_cents: product.price_cents ?? null,
          pictures_csv: product.pictures_csv ?? null,
          event_profile_id: row.event_profile_id,
          profile_id: profile.id ?? null,
          name: profile.name ?? '(sin nombre)',
          email: profile.email ?? '',
          city: profile.city ?? '',
          bike: profile.bike ?? '',
          avatar_url: profile.avatar_url ?? '',
        };
      });

      setRows(flat);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando compras (Plan B)');
    }
  };

  useEffect(() => {
    if (!routeId) return;
    fetchAll(routeId);
  }, [routeId]);

  // Agrupa por perfil
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.profile_id || `ep:${r.event_profile_id}`;
      if (!map.has(key)) map.set(key, { profileKey: key, user: r, lines: [] });
      map.get(key).lines.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const grandTotalCents = useMemo(
    () =>
      rows.reduce((acc, r) => acc + (r.quantity || 0) * (r.unit_price_cents || 0), 0),
    [rows]
  );

  const downloadCSV = () => {
    const headers = [
      'Fecha',
      'Nombre',
      'Email',
      'Ciudad',
      'Moto',
      'Producto',
      'Cantidad',
      'PrecioUnitario(MXN)',
      'TotalLinea(MXN)',
      'Notas',
    ];
    const lines = rows.map((r) => {
      const lineTotal = (r.quantity || 0) * (r.unit_price_cents || 0);
      return [
        new Date(r.created_at).toISOString(),
        r.name,
        r.email,
        r.city,
        r.bike,
        r.product_title,
        r.quantity,
        (r.unit_price_cents ?? 0) / 100,
        lineTotal / 100,
        (r.notes || '').replace(/\n/g, ' ').replace(/,/g, ';'),
      ];
    });
    const csv = [headers, ...lines].map((arr) => arr.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compras_route_${routeId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <Head><title>Productos comprados — NorthBikers</title></Head>
      <ToastContainer />

      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Productos comprados</h1>
              <p className="text-sm text-gray-300">
                Ruta: <span className="font-semibold">{routeTitle}</span> — ID: {routeId}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
              >
                Exportar CSV
              </button>
              <Link
                href="/routes"
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Volver a Rutas
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-300">Cargando compras…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-300">
              No hay compras registradas para esta ruta.
            </div>
          ) : (
            <>
              {/* Total general */}
              <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-300">Total general</div>
                <div className="text-2xl font-semibold">{centsToMoney(grandTotalCents)}</div>
                <div className="text-sm text-gray-300">Los precios mostrados son antes de la deducción de comisiones*</div>
              </div>

              {/* Por usuario */}
              <div className="space-y-6">
                {grouped.map(({ profileKey, user, lines }) => {
                  const subtotalCents = lines.reduce(
                    (acc, r) => acc + (r.quantity || 0) * (r.unit_price_cents || 0),
                    0
                  );
                  return (
                    <div key={profileKey} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700" />
                          )}
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-xs text-gray-300">{user.email}</div>
                            <div className="text-xs text-gray-400">{user.city} {user.bike ? `• ${user.bike}` : ''}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-300">Subtotal</div>
                          <div className="text-lg font-semibold">{centsToMoney(subtotalCents)}</div>
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
                              <th className="text-right px-4 py-2">Total</th>
                              <th className="text-left px-4 py-2">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((r) => {
                              const lineTotal = (r.quantity || 0) * (r.unit_price_cents || 0);
                              return (
                                <tr key={r.id} className="border-t border-gray-700">
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {new Date(r.created_at).toLocaleString('es-MX')}
                                  </td>
                                  <td className="px-4 py-2">{r.product_title}</td>
                                  <td className="px-4 py-2 text-right">{r.quantity}</td>
                                  <td className="px-4 py-2 text-right">{centsToMoney(r.unit_price_cents)}</td>
                                  <td className="px-4 py-2 text-right">{centsToMoney(lineTotal)}</td>
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
          )}
        </div>
      </div>
    </>
  );
}
