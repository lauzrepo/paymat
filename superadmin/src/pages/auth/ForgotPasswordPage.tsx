import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../../api/auth';
import { Button } from '../../components/ui/Button';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email);
      if (data.resetUrl) setDevUrl(data.resetUrl);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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

        {sent ? (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-2">Check your email</h1>
            <p className="text-gray-400 text-sm text-center mb-6">
              If that address is registered, a reset link has been sent.
            </p>
            {devUrl && (
              <div className="mb-4 rounded-lg bg-gray-800 border border-gray-700 p-3 text-xs text-gray-300 break-all">
                <span className="text-violet-400 font-medium">Dev link: </span>
                <a href={devUrl} className="underline hover:text-white">{devUrl}</a>
              </div>
            )}
            <p className="text-center text-sm">
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Back to login</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white text-center mb-1">Reset password</h1>
            <p className="text-gray-400 text-sm text-center mb-8">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
            </form>
            <p className="text-center text-sm mt-6">
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
