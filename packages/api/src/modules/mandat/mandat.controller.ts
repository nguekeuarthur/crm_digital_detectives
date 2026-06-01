import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { MandatService } from './mandat.service';
import { MandateStatus, ActivityType } from '@prisma/client';
import { ActivityService } from './activity.service';
import { DossierService } from './dossier.service';
import { TimeEntryService } from '../time-entry/time-entry.service';

export class MandatController {
  static async create(req: AuthRequest, res: Response) {
    const { title, description, clientId } = req.body;
    const mandat = await MandatService.createMandat({
      title,
      description,
      clientId,
      userId: req.user!.userId
    });
    res.status(201).json(mandat);
  }

  static async list(req: AuthRequest, res: Response) {
    const { status, clientId, enqueteurId, page, limit } = req.query;
    const result = await MandatService.getMandates({
      status: status as MandateStatus,
      clientId: clientId as string,
      enqueteurId: enqueteurId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(result);
  }

  static async getById(req: AuthRequest, res: Response) {
    const mandat = await MandatService.getMandatById(req.params.id);
    res.json(mandat);
  }

  static async update(req: AuthRequest, res: Response) {
    const mandat = await MandatService.updateMandat(req.params.id, {
      ...req.body,
      userId: req.user!.userId
    });
    res.json(mandat);
  }

  static async delete(req: AuthRequest, res: Response) {
    await MandatService.deleteMandat(req.params.id, req.user!.userId);
    res.status(204).send();
  }

  static async assign(req: AuthRequest, res: Response) {
    const { enqueteurId } = req.body;
    const mandat = await MandatService.assignUser(req.params.id, enqueteurId, req.user!.userId);
    res.json(mandat);
  }

  static async unassign(req: AuthRequest, res: Response) {
    const mandat = await MandatService.unassignUser(req.params.id, req.user!.userId);
    res.json(mandat);
  }

  static async getActivity(req: AuthRequest, res: Response) {
    const { type, userId, startDate, endDate, page, limit } = req.query;
    const activities = await ActivityService.getMandatActivity(req.params.id, {
      type: type as ActivityType,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    res.json(activities);
  }

  static async getGeoFiles(req: AuthRequest, res: Response) {
    const files = await MandatService.getGeoLocatedFiles(req.params.id);
    res.json(files);
  }

  static async createFolder(req: AuthRequest, res: Response) {
    const folder = await DossierService.createDossier({
      name: req.body.name,
      mandatId: req.params.id,
      parentId: req.body.parentId,
      userId: req.user!.userId
    });
    res.status(201).json(folder);
  }

  static async renameFolder(req: AuthRequest, res: Response) {
    const folder = await DossierService.renameDossier(req.params.folderId, req.body.name, req.user!.userId);
    res.json(folder);
  }

  static async deleteFolder(req: AuthRequest, res: Response) {
    await DossierService.deleteDossier(req.params.folderId, req.user!.userId);
    res.status(204).send();
  }

  static async assignSubcontractor(req: AuthRequest, res: Response) {
    const assignment = await MandatService.assignSubcontractorToMandat({
      mandatId: req.params.id,
      subcontractorId: req.body.subcontractorId,
      hourlyRate: req.body.hourlyRate,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
    }, req.user!.userId);
    res.status(201).json(assignment);
  }

  static async getTimeEntries(req: AuthRequest, res: Response) {
    const entries = await TimeEntryService.getSummaryForMandat(req.params.id);
    res.json(entries);
  }
}
