import {FiMenu} from 'react-icons/fi'
import Image from 'next/image'
import Link from 'next/link'
import {useRecoilState} from "recoil";
import {SideNavCollapsed} from "../../store/atoms/global";

const Logo = () => {
    const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);

    return (
        <div className="logo truncate">
            <Link href="/">
                <a className="flex flex-row items-center justify-start space-x-2">
                    <Image src="/ONAUTO_logo.svg" height={30} width={160} />
                </a>
            </Link>
            <button
                onClick={() => setOpen(!isOpen)}
                className="ml-auto mr-4 block lg:hidden">
                <FiMenu size={20}/>
            </button>
        </div>
    )

}

export default Logo
