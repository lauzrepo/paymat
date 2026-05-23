import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { Button } from '../../components/ui/Button';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 text-sm font-medium">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Invalid or expired token. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center text-white text-xl font-bold">
            P
          </div>
        </div>

        {success ? (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-2">Password updated</h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              Your password has been reset. Redirecting to login…
            </p>
            <p className="text-center text-sm">
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Go to login</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-1">Set new password</h1>
            <p className="text-gray-400 text-sm text-center mb-8">Choose a strong password for your super admin account.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">Reset password</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
