import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import * as api from '../api/feedback';

export function useFeedbackList(params?: { status?: string; type?: string; page?: number }) {
  return useQuery({
    queryKey: ['feedback', params],
    queryFn: () => api.getFeedbackList(params),
    placeholderData: keepPreviousData,
  });
}

export function useFeedbackSubmission(id: string) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => api.getFeedbackSubmission(id),
    enabled: !!id,
  });
}

export function useCreateFeedback() {
  return useMutation({
    mutationFn: api.createFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });
}

export function useUpdateFeedbackStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: api.FeedbackStatus }) =>
      api.updateFeedbackStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback'] }),
  });
}
