import {getSupabase} from "../utils/supabase";


const Home = () => {
    const supabase = getSupabase();

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
