import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const resetPassword = useResetPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error">Invalid or missing reset token. Please request a new link.</Alert>
        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Request new link
          </Link>
        </p>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Password updated</h2>
        <Alert variant="success">
          Your password has been reset. Redirecting you to login...
        </Alert>
        <p className="text-center text-sm">
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    resetPassword.mutate({ token, newPassword: data.newPassword });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Set new password</h2>
      {resetPassword.error && (
        <Alert variant="error">
          {(resetPassword.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Invalid or expired token'}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password"
          id="newPassword"
          type="password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
        />
        <Input
          label="Confirm password"
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        <Button type="submit" className="w-full" loading={resetPassword.isPending}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
