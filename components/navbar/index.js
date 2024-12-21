import { FiLogOut, FiMenu } from 'react-icons/fi';
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes, SideNavCollapsed } from "../../store/atoms/global";
import Select from "../select";
import { getSupabase } from "../../utils/supabase";
import { useCallback, useEffect } from "react";
import { setLoggedUser } from "../../utils";
import { useRouter } from "next/router";

const Navbar = () => {
    const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);
    const [routes, setRoutes] = useRecoilState(Routes);
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const currentRoute = useRecoilValue(CurrentRoute);
    const router = useRouter();
    const supabase = getSupabase();

    const logout = () => {
        return supabase.auth.signOut().then(() => {
            setLoggedUser('');
            router.push('/login');
        });
    };

    const getRoutes = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("routes")
                .select()
                .order('featured', { ascending: true }) // Featured routes first
                .order('title', { ascending: true });
            if (data) {
                data.reverse();
                setRoutes(data);
                setCurrentRoute(data[0]);
            }
        } catch (e) {
            console.log("Error", e);
            setRoutes([]);
        }
    }, []);

    useEffect(() => {
        getRoutes();
    }, []);

    return (
        <div className="w-full bg-gray-800 text-gray-100 border-b border-gray-700 shadow-md">
            <div className="flex items-center justify-between px-4 py-2">
                <button
                    onClick={() => setOpen(!isOpen)}
                    className="text-gray-100 hover:text-gray-300 transition duration-200"
                >
                    <FiMenu size={24} />
                </button>

                <Select
                    size="w-80"
                    placeholder="Selecciona ruta"
                    selected={currentRoute?.id}
                    items={routes}
                    inline
                    onChange={setCurrentRoute}
                    className="bg-gray-700 focus:ring focus:ring-blue-500 focus:border-blue-500"
                />

                <button
                    onClick={logout}
                    className="text-gray-100 hover:text-gray-300 transition duration-200 flex items-center"
                >
                    <FiLogOut size={20} className="mr-2" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Navbar;
