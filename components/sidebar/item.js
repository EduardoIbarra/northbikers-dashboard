import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';

const Item = ({ url, icon, title, badge, items }) => {
    const [hidden, setHidden] = useState(true);
    const router = useRouter();
    const active = router?.pathname === url;

    if (items.length === 0) {
        return (
            <Link
                href={url}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    active ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
                }`}
            >
                {icon && <span className="mr-3 text-lg">{icon}</span>}
                <span className="flex-grow">{title}</span>
                {badge && (
                    <span
                        className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}
                    >
                        {badge.text}
                    </span>
                )}
            </Link>
        );
    }

    return (
        <button
            onClick={() => setHidden(!hidden)}
            className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                active ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
            }`}
        >
            {icon && <span className="mr-3 text-lg">{icon}</span>}
            <span className="flex-grow">{title}</span>
            {badge && (
                <span
                    className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}
                >
                    {badge.text}
                </span>
            )}
            <FiChevronRight
                className={`ml-auto transform transition-transform duration-200 ${
                    hidden ? 'rotate-0' : 'rotate-90'
                }`}
            />
        </button>
    );
};

export default Item;
