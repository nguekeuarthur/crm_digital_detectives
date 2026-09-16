import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { MailSyncService } from './mail-sync.service';
import { MailService } from './mail.service';
import { prisma } from '../../shared/prisma';

export class MailController {
  /**
   * Déclenche manuellement la synchronisation IMAP (INBOX + SENT)
   */
  static async triggerSync(req: AuthRequest, res: Response) {
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays as string) : 3;
    const result = await MailSyncService.syncEmails(windowDays);
    res.json({
      success: true,
      message: 'Synchronisation IMAP bidirectionnelle terminée',
      details: result
    });
  }

  /**
   * Liste les e-mails synchronisés (avec pagination et filtres)
   */
  static async listEmails(req: AuthRequest, res: Response) {
    const { clientId, mandatId, search, direction, page = '1', limit = '20' } = req.query;

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
    if (direction) {
      where.direction = direction as string;
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

  /**
   * Détail d'un email par ID
   */
  static async getEmailById(req: AuthRequest, res: Response) {
    const id = req.params.id as string;

    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        mandat: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    // Récupérer les autres emails du même thread si un threadId existe
    let thread: typeof email[] = [];
    if (email.threadId) {
      thread = await prisma.email.findMany({
        where: {
          threadId: email.threadId,
          id: { not: email.id }
        },
        orderBy: { receivedAt: 'asc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          mandat: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      });
    }

    res.json({ ...email, thread });
  }

  /**
   * Liste des emails associés à un client (chronologique)
   * Supporte le regroupement par thread via ?grouped=true
   */
  static async getClientEmails(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    const { grouped, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { clientId: id },
        skip,
        take: limitNum,
        orderBy: { receivedAt: 'asc' }, // Tri chronologique
        include: {
          mandat: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      }),
      prisma.email.count({ where: { clientId: id } })
    ]);

    // Si regroupement par thread demandé
    if (grouped === 'true') {
      const threads = new Map<string, typeof emails>();

      for (const email of emails) {
        const key = email.threadId || email.messageId; // Emails sans thread = leur propre fil
        if (!threads.has(key)) {
          threads.set(key, []);
        }
        threads.get(key)!.push(email);
      }

      return res.json({
        client,
        threads: Array.from(threads.entries()).map(([threadId, messages]) => ({
          threadId,
          subject: messages[0].subject,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1].receivedAt,
          messages
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }

    res.json({
      client,
      data: emails,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  }

  /**
   * Envoyer un email depuis le CRM (avec BCC automatique + enregistrement en DB)
   */
  static async sendEmail(req: AuthRequest, res: Response) {
    const { to, subject, text, html, clientId, mandatId, inReplyTo } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Les champs "to" et "subject" sont requis' });
    }

    // Si c'est une réponse, construire la chaîne References
    let references: string | undefined;
    if (inReplyTo) {
      const parentEmail = await prisma.email.findUnique({
        where: { messageId: inReplyTo },
        select: { references: true, messageId: true }
      });
      if (parentEmail) {
        references = parentEmail.references
          ? `${parentEmail.references} ${parentEmail.messageId}`
          : parentEmail.messageId;
      }
    }

    const info = await MailService.sendMail({
      to,
      subject,
      text,
      html,
      clientId,
      mandatId,
      inReplyTo,
      references,
    });

    res.json({
      success: true,
      message: 'Email envoyé et enregistré',
      messageId: info.messageId
    });
  }
}
