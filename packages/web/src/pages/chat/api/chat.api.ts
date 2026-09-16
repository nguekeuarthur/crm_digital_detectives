import { api } from '../../../shared/api/base';

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'USER' | 'AGENT' | 'BOT' | 'SYSTEM';
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  visitorId: string;
  status: 'BOT' | 'HUMAN' | 'CLOSED';
  botState: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export const fetchSessions = async (): Promise<ChatSession[]> => {
  const { data } = await api.get('/chat/sessions');
  return data;
};

export const fetchSessionMessages = async (sessionId: string): Promise<ChatSession> => {
  const { data } = await api.get(`/chat/sessions/${sessionId}`);
  return data;
};
