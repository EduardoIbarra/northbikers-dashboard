import { FiMenu } from 'react-icons/fi'
import Image from 'next/image'
import Link from 'next/link'
import { useRecoilState } from "recoil";
import { SideNavCollapsed } from "../../store/atoms/global";

const Logo = () => {
    const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);

    return (
        <div className="logo">
            <Link href="/" className="flex flex-row items-center justify-start space-x-2">
                {!isOpen ? (
                    <Image src="/logo_nb_white.png" height={80} width={160} alt="Logo" />
                ) : (
                    <Image src="/icon.jpg" height={30} width={30} alt="Icon" />
                )}
            </Link>

            <button
                onClick={() => setOpen(!isOpen)}
                className="ml-auto mr-4 block lg:hidden">
                <FiMenu size={20} />
            </button>
        </div>
    )

}

export default Logo
