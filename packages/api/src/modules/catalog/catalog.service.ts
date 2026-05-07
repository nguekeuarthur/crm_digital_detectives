import { prisma } from '../../shared/prisma';
import { ServiceUnit, ServiceCategory } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ValidationError } from '../../shared/errors';
import * as XLSX from 'xlsx';

export class CatalogService {
  /**
   * Créer une nouvelle prestation
   */
  static async createService(data: {
    name: string;
    description?: string;
    unitPrice: number;
    internalCost?: number;
    unit: ServiceUnit;
    category: ServiceCategory;
  }, userId: string) {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        unitPrice: data.unitPrice,
        internalCost: data.internalCost || 0,
        unit: data.unit,
        category: data.category
      }
    });

    await AuditService.log({
      userId,
      action: 'CREATE_SERVICE',
      entity: 'Service',
      entityId: service.id,
      newValue: service
    });

    return service;
  }

  /**
   * Lister toutes les prestations actives
   */
  static async getServices(filters?: { category?: ServiceCategory; isActive?: boolean }) {
    return prisma.service.findMany({
      where: {
        category: filters?.category,
        isActive: filters?.isActive !== undefined ? filters.isActive : true
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Récupérer une prestation par son ID
   */
  static async getServiceById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id }
    });
    if (!service) throw new ValidationError('Prestation non trouvée');
    return service;
  }

  /**
   * Mettre à jour une prestation
   */
  static async updateService(id: string, data: Partial<{
    name: string;
    description: string;
    unitPrice: number;
    internalCost: number;
    unit: ServiceUnit;
    category: ServiceCategory;
    isActive: boolean;
  }>, userId: string) {
    const current = await this.getServiceById(id);

    const updated = await prisma.service.update({
      where: { id },
      data
    });

    await AuditService.log({
      userId,
      action: 'UPDATE_SERVICE',
      entity: 'Service',
      entityId: id,
      oldValue: current,
      newValue: updated
    });

    return updated;
  }

  /**
   * Supprimer (désactiver) une prestation
   */
  static async deleteService(id: string, userId: string) {
    await this.updateService(id, { isActive: false }, userId);
  }

  /**
   * Import depuis fichier Excel
   */
  static async importFromExcel(fileBuffer: Buffer, userId: string) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    let created = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        // Validation basique des colonnes attendues
        if (!row.Nom || !row.PrixUnitaire) {
          errors.push(`Ligne ${index + 2}: Nom et PrixUnitaire sont requis`);
          continue;
        }

        await prisma.service.create({
          data: {
            name: String(row.Nom),
            description: row.Description ? String(row.Description) : null,
            unitPrice: parseFloat(row.PrixUnitaire),
            internalCost: row.CoutInterne ? parseFloat(row.CoutInterne) : 0,
            unit: (row.Unite as ServiceUnit) || 'HOUR',
            category: (row.Categorie as ServiceCategory) || 'INVESTIGATION',
            isActive: true
          }
        });
        created++;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        errors.push(`Ligne ${index + 2}: ${err.message}`);
      }
    }

    await AuditService.log({
      userId,
      action: 'IMPORT_SERVICES',
      entity: 'Service',
      newValue: { created, errorCount: errors.length }
    });

    return { created, errors };
  }
}
