import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

const SearchableSelect = ({
    items = [],
    selected,
    onChange,
    placeholder = 'Selecciona una opción',
    className = '',
    size = 'w-full',
    inline = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selectedItem = useMemo(() => {
        return items.find(item => item.id == selected);
    }, [items, selected]);

    // Filter items based on search term
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (item.disabled && item.id?.toString().startsWith('sep-')) return true; // Keep dividers
            return item.title?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [items, searchTerm]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setSearchTerm('');
        }
    }, [isOpen]);

    const handleSelect = (item) => {
        if (item.disabled) return;
        onChange(item);
        setIsOpen(false);
    };

    return (
        <div 
            ref={containerRef} 
            className={`relative select-none ${inline ? 'inline-block' : 'block'} ${size} ${className}`}
        >
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-gray-100 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 shadow-md focus-within:ring-2 focus-within:ring-yellow-500/20"
            >
                <span className="truncate text-sm font-medium">
                    {selectedItem ? selectedItem.title : placeholder}
                </span>
                <FiChevronDown 
                    className={`ml-2 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    size={16} 
                />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[999] mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in-down">
                    {/* Search Input Area */}
                    <div className="p-3 border-b border-neutral-800 flex items-center gap-2 bg-neutral-950">
                        <FiSearch className="text-neutral-500 shrink-0" size={16} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-gray-100 placeholder-neutral-500 focus:outline-none focus:ring-0 p-0"
                        />
                    </div>

                    {/* Scrollable List */}
                    <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-neutral-800">
                        {filteredItems.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-neutral-500 text-center">
                                No se encontraron resultados
                            </li>
                        ) : (
                            filteredItems.map((item) => {
                                const isDivider = item.disabled && item.id?.toString().startsWith('sep-');
                                if (isDivider) {
                                    return (
                                        <li 
                                            key={item.id} 
                                            className="relative flex py-2 items-center px-4 select-none bg-neutral-950/40"
                                        >
                                            <div className="flex-grow border-t border-neutral-800"></div>
                                            <span className="flex-shrink mx-3 text-[10px] font-bold text-neutral-500 tracking-widest uppercase">
                                                {item.title}
                                            </span>
                                            <div className="flex-grow border-t border-neutral-800"></div>
                                        </li>
                                    );
                                }

                                const isSelected = item.id == selected;
                                return (
                                    <li
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between
                                            ${item.disabled ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-200'}
                                            ${isSelected ? 'bg-yellow-500/10 text-yellow-500 font-semibold' : 'hover:bg-neutral-800'}
                                        `}
                                    >
                                        <span className="truncate">{item.title}</span>
                                        {isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
                                        )}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
