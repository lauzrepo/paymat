import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useRegister } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain a number'),
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const registerMutation = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => registerMutation.mutate(data);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create your account</h2>
      {registerMutation.error && (
        <Alert variant="error">
          {(registerMutation.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Registration failed'}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" id="firstName" {...register('firstName')} error={errors.firstName?.message} />
          <Input label="Last name" id="lastName" {...register('lastName')} error={errors.lastName?.message} />
        </div>
        <Input label="Email" id="email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Password" id="password" type="password" {...register('password')} error={errors.password?.message} />
        <Button type="submit" className="w-full" loading={registerMutation.isPending}>
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
