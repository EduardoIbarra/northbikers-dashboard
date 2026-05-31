import { useEffect } from 'react'
import {useRouter} from 'next/router'
import Centered from './centered'
import Empty from './empty'
import Layout from './layout'
import { getLoggedUser } from '../utils'

const Layouts = ({children}) => {
    const router = useRouter()
    let {pathname} = {...router}
    
    useEffect(() => {
        const user = getLoggedUser();
        if (user?.isParticipantsOnly && !['/participants', '/checkpoints'].includes(pathname)) {
            router.push('/participants');
        }
    }, [pathname]);

    console.log({pathname});
    if (['4', '0',].includes(pathname)) {
        return <Centered>{children}</Centered>
    }

    if (pathname === '/') return <Layout>{children}</Layout>

    if (['/participants', '/routes', '/checkpoints'].includes(pathname)) {
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
