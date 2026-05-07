import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';

export class TimeEntryService {
  /**
   * Saisie d'heures par un sous-traitant
   */
  static async create(data: {
    mandatId: string;
    subcontractorId: string;
    date: Date;
    hours: number;
    description?: string;
  }) {
    // 1. Sécurité : Vérifier que le sous-traitant est bien affecté à ce mandat
    const assignment = await prisma.mandatSubcontractor.findUnique({
      where: {
        mandatId_subcontractorId: {
          mandatId: data.mandatId,
          subcontractorId: data.subcontractorId
        }
      }
    });

    if (!assignment) {
      throw new ValidationError('Vous n\'êtes pas affecté à ce mandat. Saisie impossible.');
    }

    // 2. Création de la feuille de temps
    const entry = await prisma.timeEntry.create({
      data: {
        mandatId: data.mandatId,
        subcontractorId: data.subcontractorId,
        date: data.date,
        hours: data.hours,
        description: data.description,
        validated: false // Toujours faux à la création, l'Admin doit valider
      }
    });

    // 3. Traçabilité
    await AuditService.log({
      userId: data.subcontractorId,
      action: 'ADD_TIME_ENTRY',
      entity: 'TimeEntry',
      entityId: entry.id,
      newValue: { hours: data.hours, date: data.date }
    });

    return entry;
  }

  /**
   * Validation d'une saisie par l'Admin
   */
  static async validate(id: string, adminId: string) {
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: { validated: true }
    });

    await AuditService.log({
      userId: adminId,
      action: 'VALIDATE_TIME_ENTRY',
      entity: 'TimeEntry',
      entityId: id
    });

    return entry;
  }

  /**
   * Résumé des heures par sous-traitant pour un mandat (pour la facture)
   */
  static async getSummaryForMandat(mandatId: string) {
    const entries = await prisma.timeEntry.findMany({
      where: { mandatId },
      include: {
        subcontractor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { date: 'desc' }
    });

    // On pourrait aussi faire un GROUP BY ici avec prisma.timeEntry.groupBy
    // Mais on renvoie le détail pour la fiche mandat UI
    return entries;
  }
}
