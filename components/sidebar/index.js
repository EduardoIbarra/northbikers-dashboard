// components/sidebar/index.js
import React from 'react';
import Item from './item';
import Logo from './logo';
import { routes } from '../../utils/routes';
import { useRecoilValue } from 'recoil';
import { SideNavCollapsed } from '../../store/atoms/global';

const Sidebar = () => {
  const isOpen = useRecoilValue(SideNavCollapsed);

  return (
    <aside
      className={[
        // Drawer móvil (fixed) + panel desktop (relative)
        'fixed inset-y-0 left-0 z-40 w-72 md:w-64 bg-gray-900 text-gray-200',
        'flex flex-col shadow-lg transition-transform duration-300 ease-in-out will-change-transform',
        // Deslizable en móvil
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Siempre visible en >= md
        'md:relative md:translate-x-0'
      ].join(' ')}
      aria-hidden={!isOpen}
      aria-label="Barra lateral de navegación"
    >
      {/* Logo / Header */}
      <div className="p-6 border-b border-gray-700">
        <Logo />
      </div>

      {/* Items */}
      <ul className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
        {routes.map((i) => (
          <li
            key={i.url}
            className="pl-4 hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <Item {...i} />
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
