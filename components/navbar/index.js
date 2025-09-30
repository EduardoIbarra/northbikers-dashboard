import { FiLogOut, FiMenu } from 'react-icons/fi';
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { CurrentRoute, Routes, SideNavCollapsed } from "../../store/atoms/global";
import Select from "../select";
import { getSupabase } from "../../utils/supabase";
import { useCallback, useEffect } from "react";
import { setLoggedUser, getLoggedUser } from "../../utils";
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
        const userId = getLoggedUser()?.id;
        console.log('User id: ', userId);

        if (!userId) {
            setRoutes([]);
            return;
        }

        try {
            // Step 1: Get the route_access from profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("route_access")
                .eq("id", userId)
                .single();

            if (profileError) throw profileError;

            let query = supabase.from("routes").select();

            // Step 2: Apply filtering logic
            if (profile?.route_access && profile.route_access !== "0") {
                const ids = profile.route_access.split(",").map(id => parseInt(id.trim(), 10));
                query = query.in("id", ids);
            }

            // Step 3: Order routes
            const { data, error } = await query
                .order('featured', { ascending: true })
                .order('title', { ascending: true });

            if (error) throw error;

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
                    className="text-gray-100 hover:text-gray-300 transition duration-200 md:hidden"
                >
                    <FiMenu size={24} />
                </button>

                {/* Show select only on larger screens */}
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

                <button
                    onClick={logout}
                    className="text-gray-100 hover:text-gray-300 transition duration-200 flex items-center text-sm md:text-base"
                >
                    <FiLogOut size={20} className="mr-2" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Navbar;
