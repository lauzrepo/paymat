import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  BookOpen,
  ClipboardList,
  FileText,
  CreditCard,
  Receipt,
  Settings,
  MessageSquare,
  X,
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
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: branding } = useTenantBranding();
  const primaryColor = branding?.primaryColor ?? '#4f46e5';

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-200',
      'md:relative md:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.name} className="h-8 w-auto object-contain flex-shrink-0" />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {(branding?.name ?? 'P')[0].toUpperCase()}
            </div>
          )}
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
            {branding?.name ?? 'Admin Portal'}
          </span>
        </div>
        <button className="md:hidden text-gray-500 dark:text-gray-400 flex-shrink-0" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
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
