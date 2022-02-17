import React from "react";
import {AiOutlineLoading3Quarters} from "react-icons/ai";

const Spinner = ({size = 32}) => (
    <div className="flex justify-center items-center">
        <AiOutlineLoading3Quarters size={size}  className="animate-spin"/>
    </div>
)

export default Spinner
