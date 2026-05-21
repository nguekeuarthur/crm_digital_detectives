import { api } from './base';

export interface DashboardStats {
  activeMandates: { value: number; change: string };
  totalClients: { value: number; change: string };
  monthRevenue: { value: number; change: string };
  successRate: { value: number; change: string };
}

export interface UrgentAction {
  urgentCount: number;
  mandates: unknown[];
}

export interface MandatesByStatus {
  [key: string]: number;
}

export interface ClientWithMandates {
  id: string;
  firstName: string;
  lastName: string;
  mandats: unknown[];
}

export interface RevenueByClient {
  id: string;
  name: string;
  mandateCount: number;
  estimatedRevenue: number;
}

export class StatisticsApi {
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get('/statistics/dashboard');
    return response.data;
  }

  static async getUrgentActions(): Promise<UrgentAction> {
    const response = await api.get('/statistics/urgent-actions');
    return response.data;
  }

  static async getCompletedTasks(): Promise<{ completedTasks: number }> {
    const response = await api.get('/statistics/completed-tasks');
    return response.data;
  }

  static async getMandatesByStatus(): Promise<MandatesByStatus> {
    const response = await api.get('/statistics/mandates-by-status');
    return response.data;
  }

  static async getClientsWithMandates(limit = 10): Promise<ClientWithMandates[]> {
    const response = await api.get(`/statistics/clients-with-mandates?limit=${limit}`);
    return response.data;
  }

  static async getRevenueByClient(): Promise<RevenueByClient[]> {
    const response = await api.get('/statistics/revenue-by-client');
    return response.data;
  }

  static async getActiveSubcontractors(): Promise<unknown[]> {
    const response = await api.get('/statistics/active-subcontractors');
    return response.data;
  }

  static async getHoursWorked(): Promise<{ hoursWorked: number }> {
    const response = await api.get('/statistics/hours-worked');
    return response.data;
  }
}
