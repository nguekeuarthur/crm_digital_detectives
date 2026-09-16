import { api } from './base';

export interface QuoteItem {
  id?: string;
  serviceId?: string;
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalHT?: number;
}

export interface Quote {
  id: string;
  reference: string;
  mandatId: string;
  clientId: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED';
  totalHT: number;
  totalTTC: number;
  taxRate: number;
  marginRate?: number;
  pdfPath?: string;
  sentAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  items?: QuoteItem[];
  mandat?: {
    title: string;
  };
}

export class QuoteApi {
  static async list(params?: { clientId?: string; mandatId?: string; status?: string }): Promise<Quote[]> {
    const response = await api.get('/quotes', { params });
    return response.data;
  }

  static async getById(id: string): Promise<Quote> {
    const response = await api.get(`/quotes/${id}`);
    return response.data;
  }

  static async create(data: {
    mandatId: string;
    clientId: string;
    taxRate?: number;
    expiresAt?: string;
    notes?: string;
    items: QuoteItem[];
  }): Promise<Quote> {
    const response = await api.post('/quotes', data);
    return response.data;
  }

  static async updateStatus(id: string, status: Quote['status']): Promise<Quote> {
    const response = await api.patch(`/quotes/${id}/status`, { status });
    return response.data;
  }

  static async send(id: string): Promise<{ message: string; status: string }> {
    const response = await api.post(`/quotes/${id}/send`);
    return response.data;
  }

  static async generatePdf(id: string): Promise<{ message: string; pdfPath: string }> {
    const response = await api.post(`/quotes/${id}/generate-pdf`);
    return response.data;
  }
}
