import Link from 'next/link';
import { useRouter } from 'next/router';

export default function RewardLayout({ children }) {
  const router = useRouter();

  const navItems = [
    { href: '/reward/rankings', label: '🏁 Ranking' },
    { href: '/reward/redeem', label: '🎁 Canjear puntos' },
    { href: '/reward/manage', label: '📝 Administrar Artículos' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="bg-gray-100 w-full md:w-60 p-4 border-r">
        <h2 className="text-xl font-bold mb-4">Recompensas</h2>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded hover:bg-gray-200 ${
                router.pathname.startsWith(item.href) ? 'bg-gray-200 font-semibold' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
