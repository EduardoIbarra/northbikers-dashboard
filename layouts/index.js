import {useRouter} from 'next/router'
import Centered from './centered'
import Empty from './empty'
import Layout from './layout'

const Layouts = ({children}) => {
  const router = useRouter()
  let {pathname} = {...router}
  if (['/404', '/500'].includes(pathname)) {
    return <Centered>{children}</Centered>
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
    ['/landing', '/login-1', '/login-2', '/login-3'].includes(pathname)
  ) {
    return <Empty>{children}</Empty>
  } else {
    return <Layout>{children}</Layout>
  }
}

export default Layouts
