import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../../store/authStore';
import * as authApi from '../../api/auth';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(form.email, form.password);
      authStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      authStore.setUser(data.superAdmin);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
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
        <h1 className="text-2xl font-bold text-white text-center mb-1">Super Admin</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Sign in to manage Paymat clients</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
