import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { chat, ChatMessage } from '../services/assistantService';

export const chatWithAssistant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Not authenticated');

  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AppError(400, 'messages array is required');
  }

  if (messages.length > 50) {
    throw new AppError(400, 'Conversation too long (max 50 messages)');
  }

  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role) || typeof msg.content !== 'string') {
      throw new AppError(400, 'Invalid message format');
    }
  }

  const reply = await chat(messages, req.organization!.id, req.user.userId);

  res.status(200).json({ status: 'success', data: { reply } });
});
