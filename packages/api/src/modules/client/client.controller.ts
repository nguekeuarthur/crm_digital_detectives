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
    const { search, status, startDate, endDate, source, hasActiveMandats, sortBy, sortOrder, page, limit } = req.query;
    const result = await ClientService.getClients({
      search: search as string,
      status: status as ClientStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      source: source as 'WP' | 'CRM',
      hasActiveMandats: hasActiveMandats === 'true',
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  }

  static async exportCsv(req: AuthRequest, res: Response) {
    const { search, status, startDate, endDate, source, hasActiveMandats } = req.query;
    const csv = await ClientService.exportCsv({
      search: search as string,
      status: status as ClientStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      source: source as 'WP' | 'CRM',
      hasActiveMandats: hasActiveMandats === 'true',
    });
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clients-${date}.csv"`);
    res.send('﻿' + csv); // BOM UTF-8 pour Excel
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

  static async checkDuplicate(req: AuthRequest, res: Response) {
    const result = await ClientService.checkDuplicate(req.body);
    res.json(result);
  }
}
