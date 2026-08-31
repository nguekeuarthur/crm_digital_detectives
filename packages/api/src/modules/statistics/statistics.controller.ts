import { Request, Response } from 'express';
import { StatisticsService } from './statistics.service';

export class StatisticsController {
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await StatisticsService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Failed to get dashboard statistics' });
    }
  }

  static async getUrgentActions(req: Request, res: Response) {
    try {
      const data = await StatisticsService.getUrgentActions();
      res.json(data);
    } catch (error) {
      console.error('Error getting urgent actions:', error);
      res.status(500).json({ error: 'Failed to get urgent actions' });
    }
  }

  static async getCompletedTasks(req: Request, res: Response) {
    try {
      const count = await StatisticsService.getCompletedTasksThisMonth();
      res.json({ completedTasks: count });
    } catch (error) {
      console.error('Error getting completed tasks:', error);
      res.status(500).json({ error: 'Failed to get completed tasks' });
    }
  }

  static async getMandatesByStatus(req: Request, res: Response) {
    try {
      const stats = await StatisticsService.getMandatesByStatus();
      res.json(stats);
    } catch (error) {
      console.error('Error getting mandates by status:', error);
      res.status(500).json({ error: 'Failed to get mandates by status' });
    }
  }

  static async getClientsWithMandates(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const clients = await StatisticsService.getClientsWithMandates(limit);
      res.json(clients);
    } catch (error) {
      console.error('Error getting clients with mandates:', error);
      res.status(500).json({ error: 'Failed to get clients' });
    }
  }

  static async getRevenueByClient(req: Request, res: Response) {
    try {
      const data = await StatisticsService.getRevenueByClient();
      res.json(data);
    } catch (error) {
      console.error('Error getting revenue by client:', error);
      res.status(500).json({ error: 'Failed to get revenue data' });
    }
  }

  static async getActiveSubcontractors(req: Request, res: Response) {
    try {
      const data = await StatisticsService.getActiveSubcontractors();
      res.json(data);
    } catch (error) {
      console.error('Error getting active subcontractors:', error);
      res.status(500).json({ error: 'Failed to get subcontractors' });
    }
  }

  static async getHoursWorked(req: Request, res: Response) {
    try {
      const hours = await StatisticsService.getHoursWorkedThisMonth();
      res.json({ hoursWorked: hours });
    } catch (error) {
      console.error('Error getting hours worked:', error);
      res.status(500).json({ error: 'Failed to get hours worked' });
    }
  }
}
