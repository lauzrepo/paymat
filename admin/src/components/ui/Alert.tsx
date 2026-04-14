import { cn } from '../../lib/utils';

interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  error: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
  success: 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
};

export function Alert({ variant = 'error', children, className }: AlertProps) {
  return (
    <div className={cn('rounded-md px-4 py-3 text-sm', variants[variant], className)}>
      {children}
    </div>
  );
}
