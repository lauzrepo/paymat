import { useMutation } from '@tanstack/react-query';
import * as api from '../api/feedback';

export function useSubmitFeedback() {
  return useMutation({ mutationFn: api.submitFeedback });
}
