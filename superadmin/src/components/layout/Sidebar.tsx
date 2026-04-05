import { NavLink } from 'react-router-dom';
import { Building2, Mail, Settings, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/', label: 'Organizations', icon: Building2, end: true },
  { to: '/invites', label: 'Invites', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 bg-gray-900 flex flex-col transition-transform duration-200',
      'md:relative md:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            P
          </div>
          <div>
            <span className="text-sm font-semibold text-white block">Paymat</span>
            <span className="text-xs text-gray-400">Super Admin</span>
          </div>
        </div>
        <button className="md:hidden text-gray-400 flex-shrink-0" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
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
