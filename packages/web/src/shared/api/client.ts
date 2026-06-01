import { api } from './base';

export interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  company?: string;
  status: 'PROSPECT' | 'ACTIF' | 'INACTIF';
  wpId?: string;
  createdAt: string;
  updatedAt: string;
  mandats?: { id: string }[];
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DuplicateResult {
  client: Client;
  score: number;
  reasons: string[];
}

export class ClientApi {
  static async list(params?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    source?: 'WP' | 'CRM';
    hasActiveMandats?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<ClientListResponse> {
    const response = await api.get('/clients', { params });
    const raw = response.data;
    return { ...raw, clients: raw.data ?? raw.clients ?? [] };
  }

  static async exportCsv(params?: {
    search?: string;
    status?: string;
    source?: 'WP' | 'CRM';
    hasActiveMandats?: boolean;
  }): Promise<void> {
    const response = await api.get('/clients/export', { params, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  static async getById(id: string): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  }

  static async create(data: Partial<Client>): Promise<Client> {
    const response = await api.post('/clients', data);
    return response.data;
  }

  static async update(id: string, data: Partial<Client>): Promise<Client> {
    const response = await api.patch(`/clients/${id}`, data);
    return response.data;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  }

  static async checkDuplicate(data: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }): Promise<{ duplicates: DuplicateResult[] }> {
    const response = await api.post('/clients/check-duplicate', data);
    return response.data;
  }
}
