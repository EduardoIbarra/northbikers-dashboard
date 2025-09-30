// components/navbar/index.js
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useMemo, useCallback, useEffect, useState } from 'react';

import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes } from "../../store/atoms/global";

import Select from "../select";
import { getSupabase } from "../../utils/supabase";
import { setLoggedUser, getLoggedUser } from "../../utils";

const NavLink = ({ href, children, onClick }) => {
  const router = useRouter();
  const active = router.pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active ? "bg-gray-700 text-white" : "text-gray-200 hover:text-white hover:bg-gray-700"
      ].join(" ")}
    >
      {children}
    </Link>
  );
};

const Navbar = () => {
  const [routes, setRoutes] = useRecoilState(Routes);
  const setCurrentRoute = useSetRecoilState(CurrentRoute);
  const currentRoute = useRecoilValue(CurrentRoute);

  const [mobileOpen, setMobileOpen] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);

  const logout = async () => {
    await supabase.auth.signOut();
    setLoggedUser('');
    router.push('/login');
  };

  const getRoutes = useCallback(async () => {
    const userId = getLoggedUser()?.id;
    if (!userId) {
      setRoutes([]);
      return;
    }
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("route_access")
        .eq("id", userId)
        .single();
      if (profileError) throw profileError;

      let query = supabase.from("routes").select();
      if (profile?.route_access && profile.route_access !== "0") {
        const ids = profile.route_access.split(",").map(id => parseInt(id.trim(), 10));
        query = query.in("id", ids);
      }
      const { data, error } = await query
        .order('featured', { ascending: true })
        .order('title', { ascending: true });
      if (error) throw error;

      if (Array.isArray(data) && data.length) {
        const arr = [...data].reverse();
        setRoutes(arr);
        setCurrentRoute(arr[0]);
      } else {
        setRoutes([]);
      }
    } catch (e) {
      console.log("Error", e);
      setRoutes([]);
    }
  }, [setCurrentRoute, setRoutes, supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await getRoutes();
    })();
    return () => { alive = false; };
  }, [getRoutes]);

  // Cierra el menú móvil al navegar
  useEffect(() => {
    const handle = () => setMobileOpen(false);
    router.events.on('routeChangeStart', handle);
    return () => router.events.off('routeChangeStart', handle);
  }, [router.events]);

  return (
    <header className="w-full bg-gray-800 text-gray-100 border-b border-gray-700 shadow-md">
      <div className="mx-auto flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo_nb_white.png" alt="NorthBikers" width={120} height={32} />
        </Link>

        {/* Centro: Selector de ruta (desktop) */}
        <div className="hidden md:flex">
          <Select
            size="w-80"
            placeholder="Selecciona ruta"
            selected={currentRoute?.id}
            items={routes}
            inline
            onChange={setCurrentRoute}
            className="text-gray-900 focus:ring focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Derecha: Links + logout (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <NavLink href="/routes">Rutas</NavLink>
          <NavLink href="/participants">Participantes</NavLink>
          <button
            onClick={logout}
            className="ml-2 text-gray-100 hover:text-gray-300 transition duration-200 flex items-center text-sm md:text-base"
          >
            <FiLogOut size={20} className="mr-2" />
            <span>Logout</span>
          </button>
        </div>

        {/* Botón móvil */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded hover:bg-gray-700"
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-700 bg-gray-800">
          <div className="p-3 space-y-3">
            {/* Selector de ruta también en móvil */}
            <Select
              size="w-full"
              placeholder="Selecciona ruta"
              selected={currentRoute?.id}
              items={routes}
              inline={false}
              onChange={(val) => {
                setCurrentRoute(val);
                // opcional: cerrar al seleccionar
                // setMobileOpen(false);
              }}
              className="w-full text-gray-900"
            />

            <nav className="flex flex-col">
              <NavLink href="/routes" onClick={() => setMobileOpen(false)}>Rutas</NavLink>
              <NavLink href="/participants" onClick={() => setMobileOpen(false)}>Participantes</NavLink>
              <button
                onClick={logout}
                className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-left text-gray-200 hover:bg-gray-700"
              >
                <FiLogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
