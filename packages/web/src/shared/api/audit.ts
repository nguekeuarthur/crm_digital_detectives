import { api } from './base';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export interface AuditLogResponse {
  logs: AuditLog[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export class AuditApi {
  static async getLogs(params?: {
    page?: number;
    limit?: number;
    entity?: string;
    entityId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogResponse> {
    const response = await api.get('/audit', { params });
    return response.data;
  }
}
