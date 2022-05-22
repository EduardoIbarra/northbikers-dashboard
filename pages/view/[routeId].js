import ParticipantsPage from "../participants";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {useSetRecoilState} from "recoil";
import {CurrentRoute} from "../../store/atoms/global";
import {getLoggedUser} from "../../utils";

const RoutePage = () => {
    const router = useRouter()
    const {routeId} = router.query
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    const loggedUser = getLoggedUser();

    useEffect(() => {
        setCurrentRoute({id: routeId})
    }, [routeId])


    // comment code if view is public
    if(!loggedUser){
        router.push('/login')
        return null;
    }
    return (
        <div className="p-12 bg-gray-50">
            <div className='bg-white p-4 rounded'>
                <ParticipantsPage isPrivateView={false}/>
            </div>
        </div>
    )
}

export default RoutePage
