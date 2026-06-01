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
  mandats?: unknown[];
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
  static async list(params?: { status?: string; limit?: number; page?: number; search?: string }): Promise<ClientListResponse> {
    const response = await api.get('/clients', { params });
    const raw = response.data;
    // API returns { data: [...] } — normalize to { clients: [...] }
    return { ...raw, clients: raw.data ?? raw.clients ?? [] };
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
