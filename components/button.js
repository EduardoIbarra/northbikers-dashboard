import React from "react";

const Button = ({onClick, title, color = 'yellow', className = '', children, disabled = false}) => {
    // Check if className already specifies color/background
    const hasCustomText = className.includes('text-');
    const hasCustomBg = className.includes('bg-');

    const colorClasses = color === 'yellow' 
        ? `${!hasCustomBg ? 'hover:bg-yellow-50' : ''} ${!hasCustomText ? 'text-yellow-500' : ''} border-yellow-500 border-opacity-20`
        : `${!hasCustomBg ? `hover:bg-${color}-50` : ''} ${!hasCustomText ? `text-${color}-500` : ''} border-${color}-500 border-opacity-20`;

    return (
        <button
            disabled={disabled}
            onClick={onClick || function(){}}
            className={`transition-all duration-300 border rounded-xl font-bold ${colorClasses} ${className}`}>
            {title || children}
        </button>
    )
}

export default Button
