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
                className={`flex items-center px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
                    active 
                        ? 'bg-yellow-500 text-yellow-500 border-l-4 border-yellow-500' 
                        : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 border-l-4 border-transparent'
                }`}
            >
                {icon && <span className={`mr-4 text-xl transition-colors ${active ? 'text-yellow-500' : 'text-neutral-600 group-hover:text-neutral-400'}`}>{icon}</span>}
                <span className="flex-grow">{title}</span>
                {badge && (
                    <span
                        className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${badge.color}`}
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
            className={`flex items-center w-full px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
                active 
                    ? 'bg-yellow-500 text-yellow-500 border-l-4 border-yellow-500' 
                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 border-l-4 border-transparent'
            }`}
        >
            {icon && <span className={`mr-4 text-xl transition-colors ${active ? 'text-yellow-500' : 'text-neutral-600'}`}>{icon}</span>}
            <span className="flex-grow text-left">{title}</span>
            {badge && (
                <span
                    className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${badge.color}`}
                >
                    {badge.text}
                </span>
            )}
            <FiChevronRight
                className={`ml-auto transform transition-transform duration-300 ${
                    hidden ? 'rotate-0' : 'rotate-90'
                } ${active ? 'text-yellow-500' : 'text-neutral-600'}`}
            />
        </button>
    );
};

export default Item;
