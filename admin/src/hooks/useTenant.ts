import { useQuery } from '@tanstack/react-query';
import { getTenantBranding } from '../api/tenant';

export function useTenantBranding() {
  return useQuery({
    queryKey: ['tenant', 'branding'],
    queryFn: getTenantBranding,
    staleTime: 1000 * 60 * 5, // 5 min — sandboxMode can change after promotion
  });
}
