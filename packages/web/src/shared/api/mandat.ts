import { api } from './base';

export type MandatStatus = 'OUVERT' | 'EN_COURS' | 'EN_ATTENTE_PREUVES' | 'A_VALIDER' | 'TERMINE' | 'ANNULE';

export interface Mandat {
  id: string;
  title: string;
  description?: string;
  status: MandatStatus;
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
    status?: MandatStatus | string;
    clientId?: string;
    enqueteurId?: string;
  }): Promise<MandatListResponse> {
    const response = await api.get('/mandates', { params });
    const raw = response.data;
    return { ...raw, mandates: raw.mandates ?? raw.data ?? [] };
  }

  static async getById(id: string): Promise<Mandat> {
    const response = await api.get(`/mandates/${id}`);
    return response.data;
  }

  static async create(data: {
    title: string;
    description?: string;
    clientId: string;
  }): Promise<Mandat> {
    const response = await api.post('/mandates', data);
    return response.data;
  }

  static async update(id: string, data: {
    title?: string;
    description?: string;
    status?: MandatStatus;
  }): Promise<Mandat> {
    const response = await api.patch(`/mandates/${id}`, data);
    return response.data;
  }

  static async assign(id: string, enqueteurId: string): Promise<Mandat> {
    const response = await api.post(`/mandates/${id}/assign`, { enqueteurId });
    return response.data;
  }

  static async unassign(id: string, userId: string): Promise<Mandat> {
    const response = await api.delete(`/mandates/${id}/assign/${userId}`);
    return response.data;
  }
}
