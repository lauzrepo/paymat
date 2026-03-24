import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { runBilling } from '../api/billing';

export function useRunBilling() {
  return useMutation({
    mutationFn: runBilling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
