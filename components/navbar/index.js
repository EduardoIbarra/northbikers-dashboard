import {FiLogOut, FiMenu} from 'react-icons/fi'
import {useRecoilState, useRecoilValue, useSetRecoilState} from "recoil";
import {CurrentRoute, Routes, SideNavCollapsed} from "../../store/atoms/global";
import Select from "../select";
import {getSupabase} from "../../utils/supabase";
import {useCallback, useEffect} from "react";
import {setLoggedUser} from "../../utils";
import {useRouter} from "next/router";

const Navbar = () => {
    const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);
    const [routes, setRoutes] = useRecoilState(Routes);
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const currentRoute = useRecoilValue(CurrentRoute);
    const router = useRouter()
    const supabase = getSupabase();


    const logout = ()=> {
        return supabase.auth.signOut().then(() => {
            setLoggedUser('')
            router.push('/login')
        });
    }


    const getRoutes = useCallback(async () => {
        try {
            const {data} = await supabase.from("routes").select()
            if (data) {
                data.reverse();
                setRoutes(data)
                setCurrentRoute(data[0])
            }
        } catch (e) {
            console.log("Error", e);
            setRoutes([])
        }
    }, [])

    useEffect(() => {
        getRoutes()
    }, [])

    return (
        <div className="navbar navbar-1 border-b">
            <div className="navbar-inner w-full flex items-center justify-start">
                <button
                    onClick={() => {
                        setOpen(!isOpen)
                    }}
                    className="mx-4">
                    <FiMenu size={20}/>
                </button>

                <Select size='w-80' placeholder='Selecciona ruta' selected={currentRoute?.id} items={routes} inline onChange={setCurrentRoute}/>

                <span className="ml-auto"/>
                <button
                    onClick={logout}
                    className="btn-transparent flex items-center justify-center h-16 w-8 mx-4">
                    <FiLogOut size={18} />
                </button>
            </div>
        </div>
    )
}

export default Navbar
