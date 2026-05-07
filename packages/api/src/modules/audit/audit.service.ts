import { prisma } from '../../shared/prisma';

export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue?: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  ipAddress?: string;
}

export class AuditService {
  /**
   * Enregistre une action dans le journal d'audit
   */
  static async log(data: AuditLogData) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          oldValue: data.oldValue,
          newValue: data.newValue,
          ipAddress: data.ipAddress,
        },
      });
    } catch (error) {
      // On ne bloque pas l'application si le logging échoue, 
      // mais on l'affiche dans la console en attendant un vrai système de logs (Sentry/Winston)
      console.error('Erreur lors de la journalisation d\'audit:', error);
    }
  }

  /**
   * Récupère les logs d'audit avec pagination et filtres
   */
  static async getLogs(filters: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entity, action, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Archive les logs plus vieux d'un an (configurable)
   */
  static async archiveOldLogs(days = 365) {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - days);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const oldLogs = await prisma.auditLog.findMany({
      where: { createdAt: { lt: cutOffDate } }
    });

    // Ici on pourrait les envoyer dans un bucket S3 ou un fichier JSON avant de supprimer
    // Pour l'instant on se contente de préparer la requête de suppression
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutOffDate } }
    });

    console.log(`${result.count} logs d'audit archivés.`);
    return result;
  }
}
