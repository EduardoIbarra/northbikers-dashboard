import ParticipantsPage from "../participants";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {useSetRecoilState} from "recoil";
import {CurrentRoute} from "../../store/atoms/global";

const RoutePage = () => {
    const router = useRouter()
    const {routeId} = router.query
    const setCurrentRoute = useSetRecoilState(CurrentRoute);
    useEffect(() => {
        setCurrentRoute({id: routeId})
    }, [routeId])
    return (
        <div className="p-12 bg-gray-50">
            <div className='bg-white p-4 rounded'>
                <ParticipantsPage isPrivateView={false}/>
            </div>
        </div>
    )
}

export default RoutePage
