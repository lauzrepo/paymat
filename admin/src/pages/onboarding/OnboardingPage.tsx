import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type Step = 'loading' | 'invalid' | 'setup' | 'done';

interface InviteInfo {
  email: string;
  recipientName: string;
  orgName: string;
}

export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ slug: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) { setStep('invalid'); return; }

    axios
      .get(`${API_BASE}/super-admin/invites/verify/${token}`)
      .then((res) => {
        setInvite(res.data.data.invite);
        const autoSlug = res.data.data.invite.orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setForm((f) => ({ ...f, slug: autoSlug }));
        setStep('setup');
      })
      .catch((err) => {
        const msg = err.response?.data?.message ?? 'This invite is invalid or has expired.';
        setErrorMsg(msg);
        setStep('invalid');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setFormError('Slug must contain only lowercase letters, numbers, and hyphens.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/super-admin/invites/redeem/${token}`, {
        slug: form.slug,
        adminPassword: form.password,
      });
      setStep('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Verifying your invite...</div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invite Not Valid</h1>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your account and organization have been created. Log in to get started.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {invite?.recipientName}. Let's get <strong>{invite?.orgName}</strong> set up on Paymat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={invite?.email ?? ''}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization URL slug</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
              <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-300 select-none">
                paymat.com/
              </span>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                pattern="[a-z0-9-]+"
                className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono"
                placeholder="acme-studio"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only. This can be changed later.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {formError && <p className="text-red-600 text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Create Account & Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
