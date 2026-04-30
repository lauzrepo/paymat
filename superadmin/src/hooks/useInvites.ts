import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvite, listInvites, resendInvite, deleteInvite, type CreateInviteInput } from '../api/invites';

export function useInviteList(page = 1) {
  return useQuery({
    queryKey: ['invites', page],
    queryFn: () => listInvites({ page }),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => createInvite(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, platformFeePercent }: { id: string; platformFeePercent?: number }) =>
      resendInvite(id, platformFeePercent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useDeleteInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}
