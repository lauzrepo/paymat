import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { authStore } from '../../store/authStore';

export function AppLayout() {
  const navigate = useNavigate();
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-4 flex-shrink-0">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
