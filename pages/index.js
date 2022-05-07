import {getLoggedUser} from "../utils";
import {useRouter} from "next/router";

const Home = () => {
    const router = useRouter()
    const loggedUser = getLoggedUser();

    if(!loggedUser){
        router.push('/login')
        return null;
    }

    return (
        <>
                <div>
                    <h2>
                        Bienvenido a NorthBikers Dashboard
                    </h2>
                </div>
        </>
    )
}


export default Home;
