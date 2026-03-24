import { cn } from '../../lib/utils';

interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  error: 'bg-red-50 text-red-800 border border-red-200',
  success: 'bg-green-50 text-green-800 border border-green-200',
  info: 'bg-blue-50 text-blue-800 border border-blue-200',
};

export function Alert({ variant = 'error', children, className }: AlertProps) {
  return (
    <div className={cn('rounded-md px-4 py-3 text-sm', variants[variant], className)}>
      {children}
    </div>
  );
}
