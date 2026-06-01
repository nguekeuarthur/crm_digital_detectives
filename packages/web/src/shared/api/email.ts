import { api } from './base';

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  htmlBody: string;
  variables: Record<string, string>;
  _count?: { logs: number };
}

export interface AutoEmailLog {
  id: string;
  templateId: string;
  recipientEmail: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorReason: string | null;
  sentAt: string | null;
  createdAt: string;
  template: { code: string; name: string };
}

export interface QueueStatus {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

export const EmailApi = {
  getTemplates: async () => {
    const { data } = await api.get<{ data: EmailTemplate[] }>('/mail/templates');
    return data.data;
  },

  updateTemplate: async (code: string, payload: { subject: string; htmlBody: string; name?: string }) => {
    const { data } = await api.put<{ success: boolean; data: EmailTemplate }>(`/mail/templates/${code}`, payload);
    return data.data;
  },

  getAutoLogs: async (params?: { page?: number; limit?: number; status?: string; templateCode?: string }) => {
    const { data } = await api.get<{ data: AutoEmailLog[]; total: number; page: number; totalPages: number }>('/mail/auto-logs', { params });
    return data;
  },

  getQueueStatus: async () => {
    const { data } = await api.get<{ queue: QueueStatus }>('/mail/queue-status');
    return data.queue;
  }
};
