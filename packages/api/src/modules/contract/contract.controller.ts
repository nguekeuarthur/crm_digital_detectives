import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { prisma } from '../../shared/prisma';
import { ContractService } from './contract.service';

export class ContractController {
  /**
   * Liste des templates de contrats (seuls les non-archivés par défaut)
   */
  static async listTemplates(req: AuthRequest, res: Response) {
    const templates = await prisma.contractTemplate.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: templates });
  }

  /**
   * Créer un nouveau template
   */
  static async createTemplate(req: AuthRequest, res: Response) {
    const { name, htmlContent, variables } = req.body;
    const template = await ContractService.createTemplate({ name, htmlContent, variables });
    res.status(201).json({ success: true, data: template });
  }

  /**
   * Mettre à jour un template (crée une nouvelle version)
   */
  static async updateTemplate(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    const { name, htmlContent, variables } = req.body;
    const template = await ContractService.updateTemplate(id, { name, htmlContent, variables });
    res.json({ success: true, data: template });
  }

  /**
   * Générer un contrat pour un mandat spécifique
   */
  static async generateContract(req: AuthRequest, res: Response) {
    const { templateId, mandatId } = req.body;
    const userId = req.user!.userId;

    if (!templateId || !mandatId) {
      return res.status(400).json({ error: { message: 'templateId et mandatId sont requis' } });
    }

    const result = await ContractService.generateContract(templateId, mandatId, userId);
    res.status(201).json({ success: true, data: result });
  }
}
