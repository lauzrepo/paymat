import { useQuery } from '@tanstack/react-query';
import { getTenantBranding } from '../api/tenant';

export function useTenantBranding() {
  return useQuery({
    queryKey: ['tenant', 'branding'],
    queryFn: getTenantBranding,
    staleTime: 1000 * 60 * 60, // 1 hour — branding rarely changes
  });
}
