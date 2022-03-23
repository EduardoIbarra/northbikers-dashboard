import React from "react";

const Button = ({onClick, title, color = 'blue', className = '', children, disabled= false}) => {
    const colorClasses = `hover:bg-${color}-50 text-${color}-500 hover:text-${color}-600`

    return (
        <button
            disabled={disabled}
            onClick={onClick || function(){}}
            className={`btn btn-default bg-transparent  btn-raised  mr-3 text-center px-6  border rounded cursor-pointer ${colorClasses} ${className}`}>
            {title || children}
        </button>
    )
}

export default Button
