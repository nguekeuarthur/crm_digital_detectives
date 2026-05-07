import { Request, Response } from 'express';
import { CatalogService } from './catalog.service';

export class CatalogController {
  static async create(req: Request, res: Response) {
    const service = await CatalogService.createService(req.body, req.user!.id);
    res.status(201).json(service);
  }

  static async getAll(req: Request, res: Response) {
    const category = req.query.category as any;
    const isActive = req.query.isActive === 'false' ? false : true;
    const services = await CatalogService.getServices({ category, isActive });
    res.json(services);
  }

  static async getById(req: Request, res: Response) {
    const service = await CatalogService.getServiceById(req.params.id);
    res.json(service);
  }

  static async update(req: Request, res: Response) {
    const service = await CatalogService.updateService(req.params.id, req.body, req.user!.id);
    res.json(service);
  }

  static async delete(req: Request, res: Response) {
    await CatalogService.deleteService(req.params.id, req.user!.id);
    res.status(204).send();
  }

  static async import(req: Request, res: Response) {
    if (!req.file) throw new Error('Aucun fichier fourni');
    const result = await CatalogService.importFromExcel(req.file.buffer, req.user!.id);
    res.json(result);
  }
}
