import { Menu } from 'lucide-react';
import { useCurrentUser, useLogout } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <button className="md:hidden text-gray-500 p-1" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden sm:block text-sm text-gray-600">
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
