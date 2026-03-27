import Link from 'next/link';
import { useRouter } from 'next/router';

const NavItem = ({ href, label, icon: Icon }) => {
    const router = useRouter();
    const isActive = router.pathname === href || router.pathname.startsWith(href + '/');

    return (
        <Link href={href}>
            <div className={`flex items-center gap-4 px-6 py-4 rounded-full transition-all duration-500 group relative overflow-hidden ${
                isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500 border border-white' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}>
                {isActive && (
                    <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                )}
                <div className={`transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm tracking-wide">{label}</span>
            </div>
        </Link>
    );
};

// SVG Icons
const TrophyIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
);

const GiftIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm0 0H4v13a2 2 0 002 2h12a2 2 0 002-2V8h-8z" />
    </svg>
);

const SettingsIcon = (props) => (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default function RewardLayout({ children }) {
    const navItems = [
        { href: '/reward/rankings', label: 'RANKING', icon: TrophyIcon },
        { href: '/reward/redeem', label: 'CANJEAR PUNTOS', icon: GiftIcon },
        { href: '/reward/manage', label: 'ADMINISTRAR', icon: SettingsIcon },
    ];

    const { useEffect } = require('react');

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const originalRootBg = root.style.backgroundColor;
        const originalBodyBg = body.style.backgroundColor;
        const originalDataBg = root.getAttribute('data-background');
        
        root.style.setProperty('background-color', '#000000', 'important');
        body.style.setProperty('background-color', '#000000', 'important');
        root.setAttribute('data-background', 'dark');
        
        return () => {
            root.style.backgroundColor = originalRootBg;
            body.style.backgroundColor = originalBodyBg;
            if (originalDataBg) root.setAttribute('data-background', originalDataBg);
            else root.removeAttribute('data-background');
        };
    }, []);

    return (
        <div className="dark flex flex-col md:flex-row h-screen bg-black text-zinc-200 overflow-hidden font-sans selection:bg-indigo-500 selection:bg-opacity-30">
            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 bg-opacity-50 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 bg-opacity-40 blur-[120px] rounded-full" />
            </div>

            {/* Sidebar */}
            <aside className="w-full md:w-80 h-auto md:h-full p-6 md:p-8 relative z-10 flex flex-col">
                <div className="flex-1 bg-zinc-900 bg-opacity-40 backdrop-blur-3xl border border-white border-opacity-5 rounded-5xl p-8 flex flex-col shadow-2xl overflow-hidden relative group">
                    {/* Interior glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-5 pointer-events-none" />
                    
                    <div className="mb-12 px-2">
                        <Link href="/reward/rankings">
                            <div className="cursor-pointer">
                                <img 
                                    src="https://dashboard.northbikers.com/_next/image/?url=%2Flogo_nb_white.png&w=128&q=75" 
                                    alt="NorthBikers Logo" 
                                    className="h-10 w-auto"
                                />
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-3 ml-1">Rewards Panel</p>
                            </div>
                        </Link>
                    </div>

                    <nav className="flex-1 space-y-3">
                        {navItems.map((item) => (
                            <NavItem key={item.href} {...item} />
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-white border-opacity-5">
                        <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 bg-opacity-10 rounded-4xl border border-white border-opacity-5 relative overflow-hidden group/card transition-all duration-700 hover:scale-[1.02]">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 bg-opacity-10 blur-2xl rounded-full" />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Support</p>
                            <p className="text-xs text-zinc-400 leading-relaxed group-hover/card:text-zinc-300 transition-colors">¿Necesitas ayuda? Contacta a soporte técnico.</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 h-full overflow-y-auto relative z-10 custom-scrollbar">
                <div className="p-4 md:p-12 min-h-screen">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
