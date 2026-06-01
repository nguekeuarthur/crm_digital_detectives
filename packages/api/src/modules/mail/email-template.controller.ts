import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { prisma } from '../../shared/prisma';

/**
 * Contrôleur pour la gestion des templates d'e-mails automatiques
 * et la consultation de l'historique d'envoi.
 */
export class EmailTemplateController {

  /**
   * Liste tous les templates d'e-mails
   */
  static async listTemplates(_req: AuthRequest, res: Response) {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { logs: true } }
      }
    });

    res.json({ data: templates });
  }

  /**
   * Récupère un template par son code
   */
  static async getTemplate(req: AuthRequest, res: Response) {
    const code = req.params.code as string;

    const template = await prisma.emailTemplate.findUnique({
      where: { code },
      include: {
        _count: { select: { logs: true } }
      }
    });

    if (!template) {
      return res.status(404).json({ error: { message: 'Template non trouvé', code: 'NOT_FOUND' } });
    }

    res.json(template);
  }

  /**
   * Met à jour un template (subject et/ou htmlBody)
   * L'admin peut modifier le contenu sans redéployer l'application
   */
  static async updateTemplate(req: AuthRequest, res: Response) {
    const code = req.params.code as string;
    const { subject, htmlBody, name } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { code } });
    if (!existing) {
      return res.status(404).json({ error: { message: 'Template non trouvé', code: 'NOT_FOUND' } });
    }

    const updated = await prisma.emailTemplate.update({
      where: { code },
      data: {
        ...(subject && { subject }),
        ...(htmlBody && { htmlBody }),
        ...(name && { name }),
      }
    });

    res.json({ success: true, message: 'Template mis à jour', data: updated });
  }

  /**
   * Liste l'historique des envois automatiques (AutoEmailLog)
   * avec pagination et filtres optionnels
   */
  static async listLogs(req: AuthRequest, res: Response) {
    const { status, templateCode, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status as string;
    }
    if (templateCode) {
      where.template = { code: templateCode as string };
    }

    const [logs, total] = await Promise.all([
      prisma.autoEmailLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: { code: true, name: true }
          }
        }
      }),
      prisma.autoEmailLog.count({ where })
    ]);

    res.json({
      data: logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  }

  /**
   * Statut de la file d'attente (compteurs par statut)
   */
  static async getQueueStatus(_req: AuthRequest, res: Response) {
    const [pending, processing, sent, failed] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'PENDING' } }),
      prisma.emailJob.count({ where: { status: 'PROCESSING' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
    ]);

    res.json({
      queue: { pending, processing, sent, failed, total: pending + processing + sent + failed }
    });
  }
}
