import { memo, useState, useEffect } from "react";
import Spinner from "../../components/spinner";
import Select from "../../components/select";
import { AiFillEdit, AiOutlineEye, AiOutlineEyeInvisible, AiFillDelete } from "react-icons/ai";

const CheckpointsList = ({ isLoading, data, onVisibilityChange, onDifficultyChange, onEdit, onDelete }) => {
    
    const TableItem = memo(({ row }) => {
        const { id, name, description, visibility, route_id, difficulty } = row;

        return (
            <tr className='group hover:bg-neutral-800 border-b border-white/5 transition-all duration-200'>
                <td className="py-4 px-4 font-mono text-xs text-gray-500">#{id}</td>
                <td className="py-4 px-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight">{name}</span>
                        <span className="text-xs text-neutral-500 font-medium truncate max-w-xs">{description}</span>
                    </div>
                </td>
                <td className="py-4 px-4">
                    <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono px-3 py-1 rounded-lg text-xs">
                        Route: {route_id || 'Global'}
                    </span>
                </td>
                <td className="py-4 px-4">
                    <div className="w-24">
                        <input
                            type="number"
                            className="bg-neutral-900 text-white text-xs border border-neutral-700 rounded-lg p-2 w-full focus:ring-yellow-500 focus:border-yellow-500"
                            value={difficulty !== null && difficulty !== undefined ? difficulty : ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                onDifficultyChange(id, val === '' ? null : Number(val));
                            }}
                            placeholder="Dificultad"
                            min="0"
                            step="any"
                        />
                    </div>
                </td>
                <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-32">
                            <select 
                                className="bg-neutral-900 text-white text-xs border border-neutral-700 rounded-lg p-2 w-full focus:ring-yellow-500 focus:border-yellow-500"
                                value={visibility === true ? 'true' : 'false'}
                                onChange={(e) => onVisibilityChange(id, e.target.value === 'true')}
                            >
                                <option value="true">Visible (True)</option>
                                <option value="false">Hidden (False)</option>
                            </select>
                        </div>
                        {visibility === true ? (
                            <AiOutlineEye className="text-green-500" size={18} />
                        ) : (
                            <AiOutlineEyeInvisible className="text-red-500" size={18} />
                        )}
                    </div>
                </td>
                <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                        <button
                            className="p-2 transition-all hover:bg-yellow-500 hover:text-black rounded-lg text-neutral-500"
                            onClick={() => onEdit(row)}
                        >
                            <AiFillEdit size={18} />
                        </button>
                        <button
                            className="p-2 transition-all hover:bg-red-500 hover:text-white rounded-lg text-neutral-500"
                            onClick={() => {
                                if (window.confirm("¿Estás seguro de que deseas eliminar este checkpoint?")) {
                                    onDelete(id);
                                }
                            }}
                            title="Eliminar"
                        >
                            <AiFillDelete size={18} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    });

    const fields = [
        { name: 'ID' },
        { name: 'Checkpoint' },
        { name: 'Ruta Orig.' },
        { name: 'Dificultad' },
        { name: 'Visibilidad' },
        { name: 'Acciones' },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Spinner size={50} />
                <span className="text-gray-500 font-medium animate-pulse">Cargando checkpoints...</span>
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-10 text-center bg-neutral-900 rounded-[2.5rem] border border-neutral-800">
                <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mb-8 border border-neutral-700 shadow-xl">
                    <span className="text-5xl">📍</span>
                </div>
                <h6 className="text-xl font-bold text-white mb-2">No se encontraron checkpoints</h6>
                <p className="text-neutral-500 max-w-xs">Intenta ajustar los filtros de búsqueda o ruta.</p>
            </div>
        );
    }

    return (
        <div className='overflow-x-auto w-full'>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-black text-neutral-500 uppercase text-[10px] font-black tracking-[0.25em]">
                        {fields.map(({ name }) => (
                            <th key={name} className="py-5 px-4 border-b border-white/5">{name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <TableItem key={row.id} row={row} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CheckpointsList;
