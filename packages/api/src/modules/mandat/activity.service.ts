import { prisma } from '../../shared/prisma';
import { ActivityType, Prisma } from '@prisma/client';

export class ActivityService {
  /**
   * Enregistre un nouvel événement dans le fil d'activité
   */
  static async push(data: {
    mandatId: string;
    userId: string;
    type: ActivityType;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any;
  }) {
    return prisma.activity.create({
      data: {
        mandatId: data.mandatId,
        userId: data.userId,
        type: data.type,
        payload: data.payload || {},
      }
    });
  }

  /**
   * Récupère le fil d'activité d'un mandat
   */
  static async getMandatActivity(mandatId: string, filters: { 
    type?: ActivityType; 
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { type, userId, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = { mandatId };
    if (type) where.type = type;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }),
      prisma.activity.count({ where })
    ]);

    return {
      data: activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}
