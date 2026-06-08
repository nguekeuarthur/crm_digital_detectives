import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { SubcontractorService } from './subcontractor.service';

export class SubcontractorController {
  static async invite(req: AuthRequest, res: Response) {
    const invite = await SubcontractorService.invite(req.body.email, req.user!.userId);
    res.status(201).json(invite);
  }

  static async accept(req: AuthRequest, res: Response) {
    const user = await SubcontractorService.acceptInvite(req.body);
    res.status(201).json(user);
  }

  static async extend(req: AuthRequest, res: Response) {
    const updated = await SubcontractorService.extendAccess(
      req.params.id as string,
      req.body.days,
      req.user!.userId
    );
    res.json(updated);
  }
}
