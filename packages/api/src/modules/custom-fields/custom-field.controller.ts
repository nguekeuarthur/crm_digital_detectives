import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldEntity } from '@prisma/client';

export class CustomFieldController {
  // --- ADMIN : Définitions ---
  static async createDefinition(req: AuthRequest, res: Response) {
    const definition = await CustomFieldService.createDefinition(req.body, req.user!.userId);
    res.status(201).json(definition);
  }

  static async getDefinitions(req: AuthRequest, res: Response) {
    const { entityType } = req.query;
    const definitions = await CustomFieldService.getDefinitions(entityType as CustomFieldEntity);
    res.json(definitions);
  }

  static async deleteDefinition(req: AuthRequest, res: Response) {
    await CustomFieldService.deleteDefinition(req.params.id, req.user!.userId);
    res.status(204).send();
  }

  // --- MÉTIER : Valeurs ---
  static async setValues(req: AuthRequest, res: Response) {
    const { entityId, entityType, values } = req.body;
    const results = await CustomFieldService.setValues(entityId, entityType as CustomFieldEntity, values, req.user!.userId);
    res.json(results);
  }

  static async getValues(req: AuthRequest, res: Response) {
    const values = await CustomFieldService.getValues(req.params.entityId);
    res.json(values);
  }
}
