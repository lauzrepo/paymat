import { NavLink } from 'react-router-dom';
import { Building2, Mail, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/', label: 'Organizations', icon: Building2, end: true },
  { to: '/invites', label: 'Invites', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          P
        </div>
        <div>
          <span className="text-sm font-semibold text-white block">Paymat</span>
          <span className="text-xs text-gray-400">Super Admin</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
