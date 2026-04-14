import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z.object({
  email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    forgotPassword.mutate(data.email, {
      onSuccess: (res) => {
        if (res.resetUrl) setDevResetUrl(res.resetUrl);
      },
    });
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h2>
        <Alert variant="success">
          If an account with that email exists, a password reset link has been sent.
        </Alert>
        {devResetUrl && (
          <Alert variant="info">
            <strong>Dev mode:</strong> <a href={devResetUrl} className="underline break-all">{devResetUrl}</a>
          </Alert>
        )}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Reset your password</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we'll send you a reset link.
        </p>
      </div>
      {forgotPassword.error && (
        <Alert variant="error">
          {(forgotPassword.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong'}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" id="email" type="email" {...register('email')} error={errors.email?.message} />
        <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
          Send reset link
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
          Back to login
        </Link>
      </p>
    </div>
  );
}
