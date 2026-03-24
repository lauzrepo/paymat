import { useCurrentUser, useLogout } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function Header() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">
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
