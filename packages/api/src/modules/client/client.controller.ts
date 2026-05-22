import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { ClientService } from './client.service';
import { ClientStatus } from '@prisma/client';

export class ClientController {
  static async create(req: AuthRequest, res: Response) {
    const client = await ClientService.createClient(req.body, req.user!.userId);
    res.status(201).json(client);
  }

  static async list(req: AuthRequest, res: Response) {
    const { search, status, startDate, endDate, page, limit } = req.query;
    const result = await ClientService.getClients({
      search: search as string,
      status: status as ClientStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(result);
  }

  static async getById(req: AuthRequest, res: Response) {
    const client = await ClientService.getClientById(req.params.id as string);
    res.json(client);
  }

  static async update(req: AuthRequest, res: Response) {
    const client = await ClientService.updateClient(req.params.id as string, req.body, req.user!.userId);
    res.json(client);
  }

  static async delete(req: AuthRequest, res: Response) {
    await ClientService.deleteClient(req.params.id as string, req.user!.userId);
    res.status(204).send();
  }

  static async getMandates(req: AuthRequest, res: Response) {
    const mandates = await ClientService.getClientMandates(req.params.id as string);
    res.json(mandates);
  }
}
