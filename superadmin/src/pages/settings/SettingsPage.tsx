import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { authStore } from '../../store/authStore';
import { changePassword } from '../../api/auth';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const [confirmed, setConfirmed] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleLogout = () => {
    authStore.clearAuth();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message ?? 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
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
        <CardHeader><h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Change Password</h2></CardHeader>
        <CardBody>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
            <Button type="submit" variant="primary" size="sm" disabled={savingPassword}>
              {savingPassword ? 'Saving…' : 'Update password'}
            </Button>
          </form>
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
