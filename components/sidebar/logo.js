// components/sidebar/logo.js
import { FiMenu } from 'react-icons/fi'
import Image from 'next/image'
import Link from 'next/link'
import { useRecoilState } from "recoil";
import { SideNavCollapsed } from "../../store/atoms/global";

const Logo = () => {
  const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);

  return (
    <div className="logo flex items-center">
      <Link href="/" className="flex flex-row items-center justify-start space-x-2">
        {/* Si colapsas el sidebar en desktop puedes alternar logotipo/icono */}
        {isOpen ? (
          <Image src="/icon.jpg" height={30} width={30} alt="Icon" />
        ) : (
          <Image src="/logo_nb_white.png" height={80} width={160} alt="Logo" />
        )}
      </Link>

      {/* Este botón sobra si ya tienes el menu en Navbar; aún así, lo mantengo por si lo quieres dentro del header del sidebar */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="ml-auto mr-1 block md:hidden"
        aria-label="Cerrar menú lateral"
      >
        <FiMenu size={20} />
      </button>
    </div>
  )
}

export default Logo
