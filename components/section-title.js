import {FiPlus} from 'react-icons/fi'

const SectionTitle = ({title, subtitle, right = null,  buttonTitle = null, onClick = null}) => {
    return (
        <div className="w-full mb-10 pt-4">
            <div className="flex flex-row items-center justify-between mb-4">
                <div className="flex flex-col">
                    <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-yellow-500 mb-2">
                        {title}
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter">{subtitle}</div>
                </div>
                {!!(buttonTitle || onClick) && (
                    <div className="flex-shrink-0 space-x-2">
                        <button onClick={onClick} className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-yellow-500 hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2">
                            <FiPlus className="stroke-current" size={18}/>
                            <span>{buttonTitle}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SectionTitle
