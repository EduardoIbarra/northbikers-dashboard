import Head from 'next/head'
import Router from 'next/router'
import NProgress from 'nprogress'
import Layout from '../layouts'
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
import {RecoilRoot} from "recoil";

Router.events.on('routeChangeStart', () => NProgress.start())
Router.events.on('routeChangeComplete', () => NProgress.done())
Router.events.on('routeChangeError', () => NProgress.done())

export default function App({Component, pageProps}) {

    return (
        <>
            <Head>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, shrink-to-fit=no"
                />
            </Head>
            <RecoilRoot>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </RecoilRoot>
        </>
    )
}
