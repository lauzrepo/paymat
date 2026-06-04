import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStaffInvite, acceptStaffInvite } from '../../api/team';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [invite, setInvite] = useState<{ email: string; orgName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) { setLoadError('Invalid invite link.'); setLoading(false); return; }
    getStaffInvite(token)
      .then((data) => { setInvite(data); setLoading(false); })
      .catch((err: { response?: { data?: { message?: string }; status?: number } }) => {
        const status = err.response?.status;
        if (status === 410) setLoadError('This invite has already been used. Please sign in.');
        else if (status === 404) setLoadError('Invite not found. It may have been cancelled.');
        else setLoadError('Failed to load invite. Please try again.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (form.password !== form.confirmPassword) { setSubmitError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    try {
      await acceptStaffInvite(token, { firstName: form.firstName, lastName: form.lastName, password: form.password });
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-sm space-y-4">
          <Alert variant="error">{loadError}</Alert>
          <p className="text-center text-sm text-gray-500">
            <a href="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">Back to sign in</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Join {invite?.orgName}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Set up your team account to get started.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          {submitError && <Alert variant="error" className="mb-4">{submitError}</Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={invite?.email ?? ''}
                disabled
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                label="Last name"
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <Input
              label="Password"
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Input
              label="Confirm password"
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
            <Button type="submit" loading={submitting} className="w-full">
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">Sign in</a>
        </p>
      </div>
    </div>
  );
}
