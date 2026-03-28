import { apiClient } from '../lib/api';

export type FeedbackType = 'feedback' | 'bug' | 'question';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackSubmission {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
}

export interface CreateFeedbackInput {
  name: string;
  email?: string;
  type: FeedbackType;
  subject: string;
  message: string;
}

export async function submitFeedback(input: CreateFeedbackInput) {
  const { data } = await apiClient.post('/feedback', input);
  return data.data.submission as FeedbackSubmission;
}

export async function getMyFeedback() {
  const { data } = await apiClient.get('/feedback');
  return data.data as { items: FeedbackSubmission[]; total: number };
}
