import { Menu, Sun, Moon } from 'lucide-react';
import { useCurrentUser, useLogout } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { dark, toggle } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <button className="md:hidden text-gray-500 dark:text-gray-400 p-1" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {user && (
          <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-300">
            {user.firstName} {user.lastName}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()} loading={logout.isPending}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
