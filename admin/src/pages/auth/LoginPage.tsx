import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useAuth';
import { authStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z.object({
  slug: z.string().min(1, 'Workspace is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: authStore.getSlug() },
  });

  const onSubmit = (data: FormData) => {
    authStore.setSlug(data.slug);
    login.mutate({ email: data.email, password: data.password });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Sign in to your account</h2>
      {login.error && (
        <Alert variant="error">
          {(login.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Login failed'}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
            <input
              type="text"
              placeholder="acme-studio"
              {...register('slug')}
              onChange={(e) => {
                e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                register('slug').onChange(e);
              }}
              className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono"
            />
            <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-l border-gray-300 select-none whitespace-nowrap">
              .cliqpaymat.app
            </span>
          </div>
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
        <Input label="Email" id="email" type="email" {...register('email')} error={errors.email?.message} />
        <div>
          <Input label="Password" id="password" type="password" {...register('password')} error={errors.password?.message} />
          <div className="mt-1 text-right">
            <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Register
        </Link>
      </p>
    </div>
  );
}
