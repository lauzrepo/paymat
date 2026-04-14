import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Receipt, MessageSquare, User, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMe, useLogout } from '../../hooks/useAuth';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { useTheme } from '../../hooks/useTheme';

export function AppLayout() {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const orgSlug = useOrgSlug();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle } = useTheme();

  const base = `/${orgSlug}`;

  const nav = [
    { to: base,                   label: 'Home',            icon: LayoutDashboard, end: true },
    { to: `${base}/enrollments`,  label: 'My Programs',     icon: BookOpen },
    { to: `${base}/invoices`,     label: 'Invoices',        icon: FileText },
    { to: `${base}/payments`,     label: 'Payment History', icon: Receipt },
    { to: `${base}/feedback`,     label: 'Support',         icon: MessageSquare },
    { to: `${base}/account`,      label: 'My Account',      icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate(`${base}/login`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-200',
        'md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Member Portal</span>
          <button className="md:hidden text-gray-500 dark:text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
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
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 dark:text-gray-400">
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <div className="hidden md:flex h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 items-center justify-end px-6">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
