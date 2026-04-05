import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Receipt, MessageSquare, User, LogOut, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMe, useLogout } from '../../hooks/useAuth';
import { useOrgSlug } from '../../context/OrgSlugContext';

export function AppLayout() {
  const { data: user } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const orgSlug = useOrgSlug();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200',
        'md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">Member Portal</span>
          <button className="md:hidden text-gray-500" onClick={() => setSidebarOpen(false)}>
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
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 mb-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
