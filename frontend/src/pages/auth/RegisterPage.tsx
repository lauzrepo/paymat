import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useRegisterMember, useMemberInvite } from '../../hooks/useAuth';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  return 'Something went wrong. Please try again.';
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');

  const register = useRegisterMember();
  const navigate = useNavigate();
  const orgSlug = useOrgSlug();

  const { data: invite, isError: inviteNotFound } = useMemberInvite(inviteToken);

  useEffect(() => {
    if (invite?.email) setEmail(invite.email);
  }, [invite?.email]);

  const emailLocked = !!invite?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirm) {
      setValidationError('Passwords do not match.');
      return;
    }

    try {
      await register.mutateAsync({ email, password, token: inviteToken ?? undefined });
      navigate(`/${orgSlug}`);
    } catch {
      // error shown below
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Member Portal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your portal login</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {inviteToken && inviteNotFound && (
            <Alert variant="error" className="mb-4">
              This invite link is invalid or has already been used.
            </Alert>
          )}
          {invite && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
              Welcome, {invite.firstName}! You've been invited to create your portal account.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {(validationError || register.isError) && (
              <Alert variant="error">
                {validationError || getErrorMessage(register.error)}
              </Alert>
            )}
            <div>
              <Input
                label="Email"
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={emailLocked}
              />
              {!emailLocked && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Use the email address from your invite or invoice.
                </p>
              )}
            </div>
            <Input
              label="Password"
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm password"
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.
            </p>
            <Button type="submit" className="w-full" loading={register.isPending}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to={`/${orgSlug}/login`} className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
