import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BookOpen,
  ClipboardList,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTenantBranding } from '../../hooks/useTenant';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/families', label: 'Families', icon: UsersRound },
  { to: '/programs', label: 'Programs', icon: BookOpen },
  { to: '/enrollments', label: 'Enrollments', icon: ClipboardList },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { data: branding } = useTenantBranding();
  const primaryColor = branding?.primaryColor ?? '#4f46e5';

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.name} className="h-8 w-auto object-contain" />
        ) : (
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {(branding?.name ?? 'P')[0].toUpperCase()}
          </div>
        )}
        <span className="text-base font-semibold text-gray-900 truncate">
          {branding?.name ?? 'Admin Portal'}
        </span>
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
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
