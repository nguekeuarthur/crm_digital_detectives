import { api } from './base';

export interface ContractTemplate {
  id: string;
  name: string;
  htmlContent: string;
  variables: string[];
  version: number;
  isArchived: boolean;
  createdAt: string;
}

export interface Contract {
  id: string;
  mandatId: string;
  templateId: string;
  fileId: string;
  generatedAt: string;
  template: ContractTemplate;
}

export const ContractApi = {
  getTemplates: async () => {
    const { data } = await api.get<{ data: ContractTemplate[] }>('/contracts/templates');
    return data.data;
  },

  createTemplate: async (payload: { name: string; htmlContent: string; variables?: string[] }) => {
    const { data } = await api.post<{ success: boolean; data: ContractTemplate }>('/contracts/templates', payload);
    return data.data;
  },

  updateTemplate: async (id: string, payload: { name: string; htmlContent: string; variables?: string[] }) => {
    const { data } = await api.put<{ success: boolean; data: ContractTemplate }>(`/contracts/templates/${id}`, payload);
    return data.data;
  },

  generateContract: async (payload: { templateId: string; mandatId: string }) => {
    const { data } = await api.post<{ success: boolean; data: { contract: Contract; file: any } }>('/contracts/generate', payload);
    return data.data;
  }
};
