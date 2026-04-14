import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { useForgotPassword } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export function ForgotPasswordPage() {
  const orgSlug = useOrgSlug();
  const [email, setEmail] = useState('');
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">Check your email</h2>
          <Alert variant="success">If an account with that email exists, a reset link has been sent.</Alert>
          <p className="text-center text-sm">
            <Link to={`/${orgSlug}/login`} className="text-indigo-600 hover:text-indigo-500 font-medium">Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter your email and we'll send you a reset link.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {forgotPassword.isError && <Alert variant="error">Something went wrong. Please try again.</Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" loading={forgotPassword.isPending}>Send reset link</Button>
          </form>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            <Link to={`/${orgSlug}/login`} className="text-indigo-600 hover:text-indigo-500 font-medium">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
