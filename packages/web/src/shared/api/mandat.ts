import { api } from './base';

export interface Mandat {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  clientId: string;
  enqueteurId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  client?: { id: string; firstName: string; lastName: string; company?: string };
  enqueteur?: { id: string; firstName: string; lastName: string };
}

export interface MandatListResponse {
  mandates: Mandat[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MandatApi {
  static async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    clientId?: string;
  }): Promise<MandatListResponse> {
    const response = await api.get('/mandates', { params });
    return response.data;
  }

  static async getById(id: string): Promise<Mandat> {
    const response = await api.get(`/mandates/${id}`);
    return response.data;
  }
}
