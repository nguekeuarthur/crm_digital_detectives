import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';

export class DossierService {
  /**
   * Crée un dossier personnalisé
   */
  static async createDossier(data: {
    name: string;
    mandatId: string;
    parentId?: string;
    userId: string;
  }) {
    // Si parentId est fourni, on vérifie qu'il appartient au même mandat
    if (data.parentId) {
      const parent = await prisma.dossier.findUnique({
        where: { id: data.parentId }
      });
      if (!parent || parent.mandatId !== data.mandatId) {
        throw new ValidationError('Dossier parent invalide');
      }
    }

    const dossier = await prisma.dossier.create({
      data: {
        name: data.name,
        mandatId: data.mandatId,
        parentId: data.parentId,
        isSystem: false, // Les dossiers créés via cette API ne sont jamais système
      }
    });

    await AuditService.log({
      userId: data.userId,
      action: 'CREATE_FOLDER',
      entity: 'Dossier',
      entityId: dossier.id,
      newValue: { name: dossier.name }
    });

    return dossier;
  }

  /**
   * Renomme un dossier (uniquement si non-système)
   */
  static async renameDossier(id: string, newName: string, userId: string) {
    const dossier = await prisma.dossier.findUnique({ where: { id } });
    if (!dossier) throw new ValidationError('Dossier non trouvé');
    
    if (dossier.isSystem) {
      throw new ValidationError('Les dossiers standards ne peuvent pas être renommés');
    }

    const updated = await prisma.dossier.update({
      where: { id },
      data: { name: newName }
    });

    await AuditService.log({
      userId,
      action: 'RENAME_FOLDER',
      entity: 'Dossier',
      entityId: id,
      oldValue: { name: dossier.name },
      newValue: { name: newName }
    });

    return updated;
  }

  /**
   * Supprime un dossier (uniquement si non-système)
   */
  static async deleteDossier(id: string, userId: string) {
    const dossier = await prisma.dossier.findUnique({ 
      where: { id },
      include: { files: true, children: true }
    });

    if (!dossier) throw new ValidationError('Dossier non trouvé');
    
    if (dossier.isSystem) {
      throw new ValidationError('Les dossiers standards ne peuvent pas être supprimés');
    }

    // On pourrait vérifier s'il contient des fichiers ou sous-dossiers
    if (dossier.files.length > 0 || dossier.children.length > 0) {
      throw new ValidationError('Impossible de supprimer un dossier qui n\'est pas vide');
    }

    await prisma.dossier.delete({ where: { id } });

    await AuditService.log({
      userId,
      action: 'DELETE_FOLDER',
      entity: 'Dossier',
      entityId: id
    });
  }

  /**
   * Liste l'arborescence d'un mandat
   */
  static async getMandateTree(mandatId: string) {
    // Récupère tous les dossiers du mandat
    const allDossiers = await prisma.dossier.findMany({
      where: { mandatId },
      include: { files: true }
    });

    // On pourrait construire une structure récursive ici si besoin
    return allDossiers;
  }
}
