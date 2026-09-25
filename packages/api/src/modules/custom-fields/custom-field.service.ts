import { prisma } from '../../shared/prisma';
import { CustomFieldType, CustomFieldEntity, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export class CustomFieldService {
  /**
   * Gestion des DÉFINITIONS (Admin)
   */
  static async createDefinition(data: {
    name: string;
    type: CustomFieldType;
    entityType: CustomFieldEntity;
    options?: unknown;
  }, userId: string) {
    const definition = await prisma.customFieldDefinition.create({
      data: {
        name: data.name,
        type: data.type,
        entityType: data.entityType,
        options: (data.options ?? null) as Prisma.InputJsonValue
      }
    });

    await AuditService.log({
      userId,
      action: 'CREATE_DEFINITION',
      entity: 'CustomFieldDefinition',
      entityId: definition.id,
      newValue: definition
    });

    return definition;
  }

  static async getDefinitions(entityType: CustomFieldEntity) {
    return prisma.customFieldDefinition.findMany({
      where: { entityType },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async deleteDefinition(id: string, userId: string) {
    await prisma.customFieldDefinition.delete({ where: { id } });
    await AuditService.log({
      userId,
      action: 'DELETE_DEFINITION',
      entity: 'CustomFieldDefinition',
      entityId: id
    });
  }

  /**
   * Gestion des VALEURS (Métier)
   */
  static async setValues(entityId: string, entityType: CustomFieldEntity, values: Record<string, string>, userId: string) {
    const operations = Object.entries(values).map(([definitionId, value]) => {
      return prisma.customFieldValue.upsert({
        where: {
          fieldDefinitionId_entityId: {
            fieldDefinitionId: definitionId,
            entityId
          }
        },
        update: { value },
        create: {
          fieldDefinitionId: definitionId,
          entityId,
          entityType,
          value
        }
      });
    });

    const results = await prisma.$transaction(operations);

    await AuditService.log({
      userId,
      action: 'UPDATE_CUSTOM_FIELDS',
      entity: entityType === CustomFieldEntity.MANDATE ? 'Mandat' : 'Client',
      entityId,
      newValue: values
    });

    return results;
  }

  static async getValues(entityId: string) {
    return prisma.customFieldValue.findMany({
      where: { entityId },
      include: { definition: true }
    });
  }
}
