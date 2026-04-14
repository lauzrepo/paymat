import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { authStore } from '../../store/authStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const [confirmed, setConfirmed] = useState(false);

  const handleLogout = () => {
    authStore.clearAuth();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Account</h2></CardHeader>
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Name</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Role</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">Super Admin</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Session</h2></CardHeader>
        <CardBody className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Sign out of the super admin portal.</p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (!confirmed) { setConfirmed(true); return; }
              handleLogout();
            }}
          >
            {confirmed ? 'Confirm sign out' : 'Sign out'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
