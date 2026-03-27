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
          'fixed inset-y-0 left-0 z-40 w-72 md:w-64 bg-black text-neutral-200',
          'flex flex-col shadow-2xl transition-transform duration-300 ease-in-out will-change-transform border-r border-neutral-900',
          // Deslizable en móvil
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Siempre visible en >= md
          'md:relative md:translate-x-0'
        ].join(' ')}
        aria-hidden={!isOpen}
        aria-label="Barra lateral de navegación"
      >
        {/* Logo / Header */}
        <div className="p-8 border-b border-neutral-900">
          <Logo />
        </div>
  
        {/* Items */}
        <ul className="flex-1 overflow-y-auto mt-6 space-y-1 mx-4">
          {routes.map((i) => (
            <li
              key={i.url}
              className="rounded-2xl transition-all duration-200 overflow-hidden"
            >
              <Item {...i} />
            </li>
          ))}
        </ul>
      </aside>
  );
};

export default Sidebar;
