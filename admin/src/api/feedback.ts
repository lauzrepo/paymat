import { apiClient } from '../lib/axios';

export type FeedbackType = 'feedback' | 'bug' | 'question';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackSubmission {
  id: string;
  organizationId: string;
  contactId: string | null;
  name: string;
  email: string | null;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
}

export interface CreateFeedbackInput {
  name: string;
  email?: string;
  type: FeedbackType;
  subject: string;
  message: string;
  contactId?: string;
}

export async function getFeedbackList(params?: {
  status?: string;
  type?: string;
  page?: number;
}) {
  const { data } = await apiClient.get('/feedback', { params });
  return data.data as { items: FeedbackSubmission[]; total: number; page: number; limit: number };
}

export async function getFeedbackSubmission(id: string) {
  const { data } = await apiClient.get(`/feedback/${id}`);
  return data.data.submission as FeedbackSubmission;
}

export async function createFeedback(input: CreateFeedbackInput) {
  const { data } = await apiClient.post('/feedback', input);
  return data.data.submission as FeedbackSubmission;
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const { data } = await apiClient.patch(`/feedback/${id}/status`, { status });
  return data.data.submission as FeedbackSubmission;
}
