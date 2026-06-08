import { Request, Response } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    const { userId, entity, action, startDate, endDate, page, limit } = req.query;

    const result = await AuditService.getLogs({
      userId: userId as string,
      entity: entity as string,
      action: action as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  }
}
