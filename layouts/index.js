import {useRouter} from 'next/router'
import Centered from './centered'
import Empty from './empty'
import Layout from './layout'

const Layouts = ({children}) => {
    const router = useRouter()
    let {pathname} = {...router}
    console.log({pathname});
    if (['/404', '/500',].includes(pathname)) {
        return <Centered>{children}</Centered>
    }

    if (pathname === '/') return <Layout>{children}</Layout>

    if (['/participants'].includes(pathname)) {
        return <Layout>{children}</Layout>
    }

    if (
        [
            '/login',
            '/contact-us-1',
            '/create-account',
            '/email-confirmation',
            '/logout',
            '/reset-password',
            '/forgot-password',
            '/lock-screen',
            '/subscribe',
            '/error-page',
            '/coming-soon'
        ].includes(pathname)
    ) {
        return <Centered>{children}</Centered>
    } else if (
        ['/landing', '/login-1', '/login-2', '/login-3', '/view/[routeId]'].includes(pathname)
    ) {
        return <Empty>{children}</Empty>
    } else {
        return <Empty>{children}</Empty>
    }
}

export default Layouts
