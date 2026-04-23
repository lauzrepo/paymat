import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { authStore } from '../../store/authStore';
import { getTenantBranding, getStripeOnboardingLink } from '../../api/tenant';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

type Step = 'loading' | 'invalid' | 'setup' | 'connect' | 'done' | 'stripe-incomplete';

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
  const [connectOnboardingUrl, setConnectOnboardingUrl] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    // Handle return from Stripe Connect onboarding
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'connected') {
      getTenantBranding()
        .then((branding) => {
          if (branding.stripeConnectOnboardingComplete === false) {
            setStep('stripe-incomplete');
          } else {
            setStep('done');
          }
        })
        .catch(() => setStep('done'));
      return;
    }
    if (stripeParam === 'refresh' && token) {
      // Re-generate onboarding link via backend and redirect again
      axios
        .post(`${API_BASE}/super-admin/invites/connect-refresh`, { token })
        .then((res) => {
          const url = res.data.data?.connectOnboardingUrl;
          if (url) window.location.href = url;
          else setStep('done');
        })
        .catch(() => setStep('done'));
      return;
    }

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
  }, [token, searchParams]);

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
      const res = await axios.post(`${API_BASE}/super-admin/invites/redeem/${token}`, {
        slug: form.slug,
        adminPassword: form.password,
      });
      authStore.setSlug(form.slug);
      const url = res.data.data?.connectOnboardingUrl;
      if (url) {
        setConnectOnboardingUrl(url);
        setStep('connect');
      } else {
        setStep('done');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-400 text-sm">Verifying your invite...</div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Invite Not Valid</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (step === 'connect') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-indigo-600 text-xl">💳</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Set up payments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            Your account is ready. The last step is connecting your payment account so you can collect membership fees.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mb-6">
            You'll be taken to Stripe to verify your business and add your bank details. This takes about 5 minutes.
          </p>
          <a
            href={connectOnboardingUrl!}
            className="block w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Set up payment processing →
          </a>
          <button
            onClick={() => navigate('/login')}
            className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Skip for now — do this later in Settings
          </button>
        </div>
      </div>
    );
  }

  async function handleResumeOnboarding() {
    if (!authStore.isAuthenticated()) {
      navigate('/login');
      return;
    }
    setResumeLoading(true);
    try {
      const { url } = await getStripeOnboardingLink();
      window.location.href = url;
    } catch {
      setResumeLoading(false);
    }
  }

  if (step === 'stripe-incomplete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-700 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-orange-600 dark:text-orange-400 text-xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Stripe setup not completed</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
            Your account is ready, but you haven't finished connecting your bank account and verifying your business with Stripe.
          </p>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">Until setup is complete, you can't:</p>
            <ul className="space-y-1.5 text-sm text-orange-800 dark:text-orange-300">
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✕</span>Accept live payments from members</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✕</span>Receive payouts to your bank account</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0">✕</span>Process real invoices</li>
            </ul>
          </div>
          <button
            onClick={handleResumeOnboarding}
            disabled={resumeLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors mb-3"
          >
            {resumeLoading ? 'Loading…' : 'Complete Stripe Setup'}
          </button>
          <button
            onClick={() => navigate(authStore.isAuthenticated() ? '/' : '/login')}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {authStore.isAuthenticated() ? 'Do it later — go to dashboard' : 'Do it later — go to login'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're all set!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your account and payment processing are fully connected. Log in to get started.
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set up your account</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Welcome, {invite?.recipientName}. Let's get <strong>{invite?.orgName}</strong> set up on Paymat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={invite?.email ?? ''}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organization URL slug</label>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
              <span className="px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm border-r border-gray-300 dark:border-gray-600 select-none">
                cliqpaymat.app/
              </span>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                pattern="[a-z0-9-]+"
                className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="acme-studio"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Lowercase letters, numbers, hyphens only. This can be changed later.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
