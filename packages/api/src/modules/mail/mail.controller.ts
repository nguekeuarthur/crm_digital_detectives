import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { MailSyncService } from './mail-sync.service';
import { prisma } from '../../shared/prisma';

export class MailController {
  /**
   * Déclenche manuellement la synchronisation IMAP
   */
  static async triggerSync(req: AuthRequest, res: Response) {
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays as string) : 3;
    const result = await MailSyncService.syncEmails(windowDays);
    res.json({
      success: true,
      message: 'Synchronisation IMAP terminée',
      details: result
    });
  }

  /**
   * Liste les e-mails synchronisés (avec pagination et filtres)
   */
  static async listEmails(req: AuthRequest, res: Response) {
    const { clientId, mandatId, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (clientId) {
      where.clientId = clientId as string;
    }
    if (mandatId) {
      where.mandatId = mandatId as string;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search as string, mode: 'insensitive' } },
        { from: { contains: search as string, mode: 'insensitive' } },
        { body: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { receivedAt: 'desc' },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          mandat: {
            select: {
              title: true,
              status: true
            }
          }
        }
      }),
      prisma.email.count({ where })
    ]);

    res.json({
      data: emails,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  }
}
