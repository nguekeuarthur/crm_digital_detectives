import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { CatalogService } from './catalog.service';

export class CatalogController {
  static async create(req: AuthRequest, res: Response) {
    const service = await CatalogService.createService(req.body, req.user!.userId);
    res.status(201).json(service);
  }

  static async getAll(req: AuthRequest, res: Response) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = req.query.category as any;
    const isActive = req.query.isActive !== 'false';
    const services = await CatalogService.getServices({ category, isActive });
    res.json(services);
  }

  static async getById(req: AuthRequest, res: Response) {
    const service = await CatalogService.getServiceById(req.params.id as string);
    res.json(service);
  }

  static async update(req: AuthRequest, res: Response) {
    const service = await CatalogService.updateService(req.params.id as string, req.body, req.user!.userId);
    res.json(service);
  }

  static async delete(req: AuthRequest, res: Response) {
    await CatalogService.deleteService(req.params.id as string, req.user!.userId);
    res.status(204).send();
  }

  static async import(req: AuthRequest, res: Response) {
    if (!req.file) throw new Error('Aucun fichier fourni');
    const result = await CatalogService.importFromExcel(req.file.buffer, req.user!.userId);
    res.json(result);
  }
}
