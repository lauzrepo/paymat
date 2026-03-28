import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvite, listInvites, type CreateInviteInput } from '../api/invites';

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
