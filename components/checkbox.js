import React from "react";

const Checkbox = ({onChange, title, checked}) => {
    return (
        <div className="flex flex-row items-center justify-start p-1 ">
            <label className="flex items-center justify-start space-x-2 cursor-pointer select-none capitalize">
                <input
                    name={title}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="form-checkbox text-blue-500 h-4 w-4"
                />
                <span>{title}</span>
            </label>
        </div>
    )
}

export default Checkbox