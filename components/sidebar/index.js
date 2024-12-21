import React from 'react';
import Item from './item';
import Logo from './logo';
import { routes } from '../../utils/routes';

const Sidebar = () => {
    return (
        <div className="h-full w-64 bg-gray-900 text-gray-200 flex flex-col shadow-lg">
            {/* Logo Section */}
            <div className="p-6 border-b border-gray-700">
                <Logo />
            </div>

            {/* Navigation Items */}
            <ul className="flex-1 overflow-y-auto mt-4 space-y-2">
                {routes.map((i) => (
                    <li
                        key={i.url}
                        className="pl-4 hover:bg-gray-700 rounded-md transition-colors duration-200"
                    >
                        {/* If nested items are added, add appropriate styling */}
                        <Item {...i} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
