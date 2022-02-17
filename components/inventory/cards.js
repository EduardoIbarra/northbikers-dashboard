import Widget from "../widget";
import {MdOutlineAutoGraph} from "react-icons/md";
import {IoMdCalendar} from "react-icons/io";
import {BsCash, BsCashStack} from "react-icons/bs";

const InventoryCards = () => {
    return (
        <div className="flex flex-col lg:flex-row w-full lg:space-x-2 space-y-2 lg:space-y-0 mb-2 lg:mb-4">
            <div className="w-full lg:w-1/4">
                <Widget
                    title="Revenue"
                    description={'588 USD'}
                    right={
                        <MdOutlineAutoGraph size={24} className="stroke-current text-gray-500" />
                    }
                />
            </div>
            <div className="w-full lg:w-1/4">
                <Widget
                    title="Rented Days"
                    description={24}
                    right={
                        <IoMdCalendar size={24} className="stroke-current text-gray-500" />
                    }
                />
            </div>
            <div className="w-full lg:w-1/4">
                <Widget
                    title="Current Price"
                    description="23 USD"
                    right={
                        <BsCash
                            size={24}
                            className="stroke-current text-gray-500"
                        />
                    }
                />
            </div>
            <div className="w-full lg:w-1/4">
                <Widget
                    title="Avg Price"
                    description="22 USD"
                    right={
                        <BsCashStack size={24} className="stroke-current text-gray-500" />
                    }
                />
            </div>
        </div>
    )
}

export default InventoryCards