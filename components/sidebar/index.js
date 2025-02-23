import React from 'react';
import Item from './item';
import Logo from './logo';
import { routes } from '../../utils/routes';
import { useRecoilValue } from 'recoil';
import { SideNavCollapsed } from '../../store/atoms/global';

const Sidebar = () => {
    const isOpen = useRecoilValue(SideNavCollapsed);

    return (
        <div
            className={`md:relative top-0 left-0 h-full w-64 bg-gray-900 text-gray-200 flex flex-col shadow-lg transform ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
            {/* Logo Section */}
            <div className="p-6 border-b border-gray-700">
                <Logo />
            </div>

            {/* Navigation Items */}
            <ul className="flex-1 overflow-y-auto mt-4 space-y-2">
                {routes.map((i) => (
                    <li key={i.url} className="pl-4 hover:bg-gray-700 rounded-md transition-colors duration-200">
                        <Item {...i} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
