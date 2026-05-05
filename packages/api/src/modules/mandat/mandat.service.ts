import { prisma } from '../../shared/prisma';
import { AuditService } from '../audit/audit.service';
import { MandatStatus } from '@prisma/client';
import { ValidationError } from '../../shared/errors';
import { ActivityService } from './activity.service';

export class MandatService {
  static readonly STANDARD_DOSSIERS = [
    'Contrats et Administratif',
    'Preuves Photographiques',
    'Vidéos et Audios',
    'Rapports et Comptes-rendus',
    'Recherches et Renseignements',
    'Facturation et Frais',
    'Correspondances'
  ];

  static async createMandat(data: { title: string; description?: string; clientId: string; userId: string }) {
    const mandat = await prisma.$transaction(async (tx) => {
      // 1. Création du mandat
      const m = await tx.mandat.create({
        data: {
          title: data.title,
          description: data.description,
          clientId: data.clientId,
          status: MandatStatus.OUVERT,
        }
      });

      // 2. Création automatique des 7 dossiers standards
      await tx.dossier.createMany({
        data: this.STANDARD_DOSSIERS.map(name => ({
          name,
          mandatId: m.id,
          isSystem: true
        }))
      });

      return m;
    });

    // 3. Audit Log (hors transaction pour éviter erreur ForeignKey)
    await AuditService.log({
      userId: data.userId,
      action: 'CREATE',
      entity: 'Mandat',
      entityId: mandat.id,
      newValue: mandat
    });

    // 4. Activity Log
    await ActivityService.push({
      mandatId: mandat.id,
      userId: data.userId,
      type: 'MANDAT_CREATED',
      payload: { title: mandat.title }
    });

    return prisma.mandat.findUnique({
      where: { id: mandat.id },
      include: { dossiers: true, client: true }
    });
  }

  static async getMandates(filters: { status?: MandatStatus; clientId?: string; enqueteurId?: string; page?: number; limit?: number }) {
    const { status, clientId, enqueteurId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (enqueteurId) where.enqueteurId = enqueteurId;

    const [mandates, total] = await Promise.all([
      prisma.mandat.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { client: true, enqueteur: { select: { firstName: true, lastName: true } } }
      }),
      prisma.mandat.count({ where })
    ]);

    return { mandates, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getMandatById(id: string) {
    const mandat = await prisma.mandat.findUnique({
      where: { id },
      include: {
        client: true,
        enqueteur: true,
        dossiers: true,
      }
    });

    if (!mandat || mandat.deletedAt) {
      throw new Error('Mandat non trouvé');
    }

    return mandat;
  }

  static async updateMandat(id: string, data: { title?: string; description?: string; status?: MandatStatus; userId: string }) {
    const current = await this.getMandatById(id);

    // Validation des transitions de statut
    if (data.status && current.status !== data.status) {
      this.validateStatusTransition(current.status, data.status);
    }

    const updated = await prisma.mandat.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
      }
    });

    if (data.status && current.status !== data.status) {
      await ActivityService.push({
        mandatId: id,
        userId: data.userId,
        type: 'STATUS_CHANGED',
        payload: { from: current.status, to: data.status }
      });
    }

    await AuditService.log({
      userId: data.userId,
      action: 'UPDATE',
      entity: 'Mandat',
      entityId: id,
      oldValue: current,
      newValue: updated
    });

    return updated;
  }

  static async getGeoLocatedFiles(mandatId: string) {
    // On cherche tous les fichiers liés aux dossiers du mandat qui ont des coordonnées GPS
    return prisma.file.findMany({
      where: {
        folder: { mandatId },
        geoLat: { not: null },
        geoLng: { not: null },
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        geoLat: true,
        geoLng: true,
        createdAt: true
      }
    });
  }

  static async deleteMandat(id: string, userId: string) {
    const mandat = await prisma.mandat.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await AuditService.log({
      userId,
      action: 'DELETE',
      entity: 'Mandat',
      entityId: id
    });

    return mandat;
  }

  static async assignUser(mandatId: string, enqueteurId: string, userId: string) {
    const updated = await prisma.mandat.update({
      where: { id: mandatId },
      data: { enqueteurId }
    });

    await AuditService.log({
      userId,
      action: 'ASSIGN',
      entity: 'Mandat',
      entityId: mandatId,
      newValue: { enqueteurId }
    });

    await ActivityService.push({
      mandatId,
      userId,
      type: 'ASSIGNMENT',
      payload: { enqueteurId }
    });

    return updated;
  }

  static async unassignUser(mandatId: string, userId: string) {
    const updated = await prisma.mandat.update({
      where: { id: mandatId },
      data: { enqueteurId: null }
    });

    await AuditService.log({
      userId,
      action: 'UNASSIGN',
      entity: 'Mandat',
      entityId: mandatId
    });

    return updated;
  }

  private static validateStatusTransition(current: MandatStatus, next: MandatStatus) {
    // Un mandat TERMINE ou ANNULE ne peut plus être modifié
    if (current === MandatStatus.TERMINE || current === MandatStatus.ANNULE) {
      throw new ValidationError(`Transition impossible : le mandat est déjà ${current}`);
    }
  }
}
