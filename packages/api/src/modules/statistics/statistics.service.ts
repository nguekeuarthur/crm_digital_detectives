import { prisma } from '../../shared/prisma';
import { MandatStatus } from '@prisma/client';

export class StatisticsService {
  // Statistiques principales pour le tableau de bord
  static async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeMandates,
      totalClients,
      monthRevenue,
      successRate,
      mandatesThisMonth,
      clientsThisMonth
    ] = await Promise.all([
      prisma.mandat.count({ where: { status: 'OUVERT', deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null } }),
      this.getMonthRevenue(startOfMonth),
      this.getSuccessRate(),
      prisma.mandat.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } })
    ]);

    return {
      activeMandates: {
        value: activeMandates,
        change: `+${mandatesThisMonth} ce mois`
      },
      totalClients: {
        value: totalClients,
        change: `+${clientsThisMonth} ce mois`
      },
      monthRevenue: {
        value: monthRevenue,
        change: '+18% vs mois dernier' // TODO: Calculer dynamiquement
      },
      successRate: {
        value: successRate,
        change: '+2% ce trimestre' // TODO: Calculer dynamiquement
      }
    };
  }

  // Mandats urgents et en attente
  static async getUrgentActions() {
    const urgentMandates = await prisma.mandat.findMany({
      where: {
        status: { in: ['OUVERT', 'EN_ATTENTE_PREUVES'] },
        deletedAt: null
      },
      include: { client: true },
      orderBy: { updatedAt: 'asc' },
      take: 10
    });

    const needsAttention = urgentMandates.filter(m => {
      const daysSinceUpdate = Math.floor((Date.now() - m.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate > 3;
    });

    return {
      urgentCount: needsAttention.length,
      mandates: needsAttention.slice(0, 5)
    };
  }

  // Tâches complétées ce mois
  static async getCompletedTasksThisMonth() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    return prisma.mandat.count({
      where: {
        status: 'TERMINE',
        updatedAt: { gte: startOfMonth },
        deletedAt: null
      }
    });
  }

  // Mandats avec statuts détaillés
  static async getMandatesByStatus() {
    const statuses = ['OUVERT', 'EN_ATTENTE_PREUVES', 'EN_COURS', 'TERMINE'];
    const results: Record<string, number> = {};

    for (const status of statuses) {
      results[status] = await prisma.mandat.count({
        where: { status: status as MandatStatus, deletedAt: null }
      });
    }

    return results;
  }

  // Clients avec mandats
  static async getClientsWithMandates(limit = 10) {
    return prisma.client.findMany({
      where: { deletedAt: null },
      include: {
        mandats: {
          where: { deletedAt: null },
          select: { id: true, status: true }
        }
      },
      orderBy: { mandats: { _count: 'desc' } },
      take: limit
    });
  }

  // Revenus par client ce mois
  static async getRevenueByClient() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      include: {
        mandats: {
          where: {
            createdAt: { gte: startOfMonth },
            deletedAt: null
          },
          select: { id: true }
        }
      }
    });

    return clients
      .map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        mandateCount: c.mandats.length,
        estimatedRevenue: c.mandats.length * 1500 // Estimation basée sur le nombre de mandats
      }))
      .filter(c => c.mandateCount > 0)
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
      .slice(0, 5);
  }

  // Sous-traitants actifs
  static async getActiveSubcontractors() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const subcontractors = await prisma.mandatSubcontractor.findMany({
      where: { startDate: { gte: startOfMonth } },
      include: {
        subcontractor: true,
        mandat: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return subcontractors;
  }

  // Heures travaillées ce mois
  static async getHoursWorkedThisMonth() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const result = await prisma.timeEntry.aggregate({
      where: {
        date: { gte: startOfMonth }
      },
      _sum: { hours: true }
    });

    return result._sum.hours || 0;
  }

  // Méthodes privées
  private static async getMonthRevenue(startOfMonth: Date): Promise<number> {
    // Simplification: basée sur le nombre de mandats * tarif moyen
    const mandatesCount = await prisma.mandat.count({
      where: {
        createdAt: { gte: startOfMonth },
        deletedAt: null
      }
    });

    // Estimation: 1500 CHF par mandat en moyenne
    return mandatesCount * 1500;
  }

  private static async getSuccessRate(): Promise<number> {
    const completed = await prisma.mandat.count({
      where: { status: 'TERMINE', deletedAt: null }
    });

    const total = await prisma.mandat.count({
      where: { deletedAt: null }
    });

    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }
}
