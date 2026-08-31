import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { TimeEntryService } from './time-entry.service';

export class TimeEntryController {
  static async create(req: AuthRequest, res: Response) {
    // Le sous-traitant saisit ses propres heures
    const entry = await TimeEntryService.create({
      mandatId: req.body.mandatId,
      subcontractorId: req.user!.userId,
      date: new Date(req.body.date),
      hours: req.body.hours,
      description: req.body.description
    });
    res.status(201).json(entry);
  }

  static async validate(req: AuthRequest, res: Response) {
    const entry = await TimeEntryService.validate(req.params.id as string, req.user!.userId);
    res.json(entry);
  }
}
