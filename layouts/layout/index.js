import Head from 'next/head'
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import {useRecoilValue} from "recoil";
import {SideNavCollapsed} from "../../store/atoms/global";

const Layout = ({children}) => {
    const isOpen = useRecoilValue(SideNavCollapsed);
    return (
        <>
            <Head>
                <title>North Bikers</title>
            </Head>
            <div
                data-layout="layout-1"
                data-collapsed={isOpen}
                data-background="light"
                data-navbar="light"
                data-left-sidebar="light"
                data-right-sidebar="light"
                className='font-sans antialiased text-sm disable-scrollbars'>
                <div className="wrapper">
                    <Sidebar/>
                    <div className="main w-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
                        <Navbar/>
                        <div className="min-h-screen w-full p-4">{children}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
export default Layout
