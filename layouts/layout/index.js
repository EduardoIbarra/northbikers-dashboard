// layouts/layout/index.js
import Head from 'next/head';
import Navbar from '../../components/navbar';

const Layout = ({ children }) => {
  return (
    <>
      <Head>
        <title>NorthBikers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex h-screen bg-gray-900 text-gray-100">
        <div className="flex flex-col flex-1 min-h-screen">
          <Navbar />
          <main className="flex-1 p-2 md:p-4 overflow-y-auto bg-gray-800">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
