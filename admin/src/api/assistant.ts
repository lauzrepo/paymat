import { apiClient } from '../lib/axios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(messages: ChatMessage[]): Promise<string> {
  const { data } = await apiClient.post<{ status: string; data: { reply: string } }>(
    '/assistant/chat',
    { messages }
  );
  return data.data.reply;
}
