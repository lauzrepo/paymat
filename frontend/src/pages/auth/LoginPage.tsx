import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { useOrgSlug } from '../../context/OrgSlugContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const orgSlug = useOrgSlug();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {login.isError && (
              <Alert variant="error">Invalid email or password.</Alert>
            )}
            <Input
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to={`/${orgSlug}/forgot-password`} className="text-indigo-600 hover:text-indigo-500 font-medium">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
