import React from "react";

const Button = ({onClick, title, color = 'blue', className = ''}) => {
    const colorClasses = `hover:bg-${color}-50 text-${color}-500 hover:text-${color}-600`

    return (
        <button
            onClick={onClick || function(){}}
            className={`btn btn-default bg-transparent  btn-raised  mr-3 text-center px-6  border rounded cursor-pointer ${colorClasses} ${className}`}>
            {title}
        </button>
    )
}

export default Button