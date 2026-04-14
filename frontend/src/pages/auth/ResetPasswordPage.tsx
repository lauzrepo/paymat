import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { useResetPassword } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export function ResetPasswordPage() {
  const orgSlug = useOrgSlug();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [matchError, setMatchError] = useState('');
  const resetPassword = useResetPassword();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="error">Invalid or missing reset token. Please request a new link.</Alert>
          <p className="text-center text-sm">
            <Link to={`/${orgSlug}/forgot-password`} className="text-indigo-600 hover:text-indigo-500 font-medium">Request new link</Link>
          </p>
        </div>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="success">Password updated! Redirecting to login…</Alert>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setMatchError("Passwords don't match"); return; }
    if (newPassword.length < 8) { setMatchError('At least 8 characters required'); return; }
    setMatchError('');
    resetPassword.mutate({ token, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set new password</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {resetPassword.isError && <Alert variant="error">Invalid or expired link. Please request a new one.</Alert>}
          {matchError && <Alert variant="error">{matchError}</Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New password" id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <Input label="Confirm password" id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <Button type="submit" className="w-full" loading={resetPassword.isPending}>Reset password</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
