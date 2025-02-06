import Head from 'next/head';
import Navbar from '../../components/navbar';
import Sidebar from '../../components/sidebar';
import { useRecoilValue } from 'recoil';
import { SideNavCollapsed } from '../../store/atoms/global';

const Layout = ({ children }) => {
    const isOpen = useRecoilValue(SideNavCollapsed);

    return (
        <>
            <Head>
                <title>NorthBikers</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <div className="flex h-screen bg-gray-900 text-gray-100">
                {/* Sidebar - Hidden on mobile unless open */}
                <Sidebar />

                {/* Main Content */}
                <div className="flex flex-col flex-1 min-h-screen">
                    {/* Navbar */}
                    <Navbar />

                    {/* Page Content */}
                    <main className="flex-1 p-2 md:p-4 overflow-y-auto bg-gray-800">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
};

export default Layout;