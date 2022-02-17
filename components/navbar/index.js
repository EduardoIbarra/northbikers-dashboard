import {FiSettings, FiMenu} from 'react-icons/fi'
import {useRecoilState} from "recoil";
import {SideNavCollapsed} from "../../store/atoms/global";

const Navbar = () => {
    const [isOpen, setOpen] = useRecoilState(SideNavCollapsed);

    return (
        <div className="navbar navbar-1 border-b">
            <div className="navbar-inner w-full flex items-center justify-start">
                <button
                    onClick={() => {
                        setOpen(!isOpen)
                    }}
                    className="mx-4">
                    <FiMenu size={20}/>
                </button>
                <span className="ml-auto"/>
                <button
                    className="btn-transparent flex items-center justify-center h-16 w-8 mx-4">
                    <FiSettings size={18} />
                </button>
            </div>
        </div>
    )
}

export default Navbar
