import Head from 'next/head'
import Router from 'next/router'
import NProgress from 'nprogress'
import Layout from '../layouts' // your main layout
import '../css/tailwind.scss'
import '../css/main.scss'
import '../css/layout.scss'
import '../css/animate.scss'
import '../css/components/buttons.scss'
import '../css/components/datepicker.scss'
import '../css/components/dropdowns.scss'
import '../css/components/forms.scss'
import '../css/components/sidebar/styles-lg.scss'
import '../css/components/sidebar/styles-sm.scss'
import '../css/components/modals.scss'
import '../css/components/navbar.scss'
import '../css/components/nprogress.scss'
import '../css/components/recharts.scss'
import '../css/components/right-sidebar.scss'
import '../css/components/sliders.scss'
import '../css/components/steps.scss'
import '../css/components/tables.scss'
import '../css/components/tabs.scss'
import '../css/components/user-widgets/widget-2.scss'
import '../css/components/user-widgets/widget-4.scss'
import { RecoilRoot } from 'recoil'
import { LoadScript } from '@react-google-maps/api'

Router.events.on('routeChangeStart', () => NProgress.start())
Router.events.on('routeChangeComplete', () => NProgress.done())
Router.events.on('routeChangeError', () => NProgress.done())

export default function App({ Component, pageProps }) {
  // If page has a custom layout, use it
  const getLayout = Component.getLayout || ((page) => (
    <Layout>
      <LoadScript googleMapsApiKey="AIzaSyDinWw03ObW9w4RzpIposc_qTLNI9dCGcQ">
        {page}
      </LoadScript>
    </Layout>
  ))

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Head>
      <RecoilRoot>{getLayout(<Component {...pageProps} />)}</RecoilRoot>
    </>
  )
}
