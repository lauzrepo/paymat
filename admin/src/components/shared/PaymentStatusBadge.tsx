import { Badge } from '../ui/Badge';
import type { PaymentStatus } from '../../types/payment';

const statusConfig: Record<PaymentStatus, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' }> = {
  completed: { label: 'Completed', variant: 'green' },
  failed: { label: 'Failed', variant: 'red' },
  pending: { label: 'Pending', variant: 'yellow' },
  refunded: { label: 'Refunded', variant: 'gray' },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant } = statusConfig[status] ?? { label: status, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}
