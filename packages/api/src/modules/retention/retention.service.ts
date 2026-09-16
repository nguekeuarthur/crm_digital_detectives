import { prisma } from '../../shared/prisma';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../file/storage.service';
import { MandatStatus, ClientStatus } from '@prisma/client';

export interface RetentionReportItem {
  id: string;
  entityType: 'MANDATE' | 'CLIENT';
  name: string;
  status: string;
  updatedAt: Date;
  expirationDate: Date;
  daysRemaining: number;
  action: 'DELETE' | 'ANONYMIZE';
  warningSent: boolean;
}

export class RetentionService {
  /**
   * Récupère toutes les politiques de rétention configurées
   */
  static async getPolicies() {
    return prisma.dataRetentionPolicy.findMany();
  }

  /**
   * Crée ou met à jour une politique de rétention
   */
  static async createOrUpdatePolicy(data: {
    entityType: 'MANDATE' | 'CLIENT';
    triggerEvent: 'MANDATE_CLOSED' | 'CLIENT_INACTIVE';
    retentionDays: number;
    action: 'DELETE' | 'ANONYMIZE';
  }) {
    return prisma.dataRetentionPolicy.upsert({
      where: {
        entityType_triggerEvent: {
          entityType: data.entityType,
          triggerEvent: data.triggerEvent,
        },
      },
      update: {
        retentionDays: data.retentionDays,
        action: data.action,
      },
      create: {
        entityType: data.entityType,
        triggerEvent: data.triggerEvent,
        retentionDays: data.retentionDays,
        action: data.action,
      },
    });
  }

  /**
   * Génère le rapport de rétention des données
   */
  static async getRetentionReport(): Promise<RetentionReportItem[]> {
    const report: RetentionReportItem[] = [];
    const now = new Date();

    // 1. Récupérer les politiques
    const mandatePolicy = await prisma.dataRetentionPolicy.findUnique({
      where: { entityType_triggerEvent: { entityType: 'MANDATE', triggerEvent: 'MANDATE_CLOSED' } },
    });
    const clientPolicy = await prisma.dataRetentionPolicy.findUnique({
      where: { entityType_triggerEvent: { entityType: 'CLIENT', triggerEvent: 'CLIENT_INACTIVE' } },
    });

    // 2. Traiter les mandats (fermés ou annulés)
    const mandates = await prisma.mandat.findMany({
      where: {
        status: { in: [MandatStatus.TERMINE, MandatStatus.ANNULE] },
        deletedAt: null,
      },
    });

    for (const m of mandates) {
      // Priorité à la politique spécifique du mandat si elle existe
      const days = m.retentionDays !== null && m.retentionDays !== undefined ? m.retentionDays : (mandatePolicy?.retentionDays || 30);
      const action = mandatePolicy?.action === 'ANONYMIZE' ? 'ANONYMIZE' as const : 'DELETE' as const;
      
      const expirationDate = new Date(m.updatedAt.getTime() + days * 24 * 60 * 60 * 1000);
      const diffTime = expirationDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Vérifier si un avertissement a été envoyé
      const warningLog = await prisma.auditLog.findFirst({
        where: {
          action: 'RETENTION_WARNING_SENT',
          entity: 'Mandat',
          entityId: m.id,
        },
      });

      report.push({
        id: m.id,
        entityType: 'MANDATE',
        name: m.title,
        status: m.status,
        updatedAt: m.updatedAt,
        expirationDate,
        daysRemaining,
        action,
        warningSent: !!warningLog,
      });
    }

    // 3. Traiter les clients inactifs
    if (clientPolicy) {
      const clients = await prisma.client.findMany({
        where: {
          status: ClientStatus.INACTIF,
          deletedAt: null,
        },
      });

      for (const c of clients) {
        const expirationDate = new Date(c.updatedAt.getTime() + clientPolicy.retentionDays * 24 * 60 * 60 * 1000);
        const diffTime = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const warningLog = await prisma.auditLog.findFirst({
          where: {
            action: 'RETENTION_WARNING_SENT',
            entity: 'Client',
            entityId: c.id,
          },
        });

        report.push({
          id: c.id,
          entityType: 'CLIENT',
          name: `${c.firstName} ${c.lastName}`,
          status: c.status,
          updatedAt: c.updatedAt,
          expirationDate,
          daysRemaining,
          action: clientPolicy.action === 'ANONYMIZE' ? 'ANONYMIZE' as const : 'DELETE' as const,
          warningSent: !!warningLog,
        });
      }
    }

    // Retourner trié par date d'expiration croissante (les plus urgents en premier)
    return report.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
  }

  /**
   * Vérifie et envoie les notifications J-7 avant suppression effective
   */
  static async sendWarnings(): Promise<number> {
    const report = await this.getRetentionReport();
    const warningsToNotify = report.filter(item => item.daysRemaining <= 7 && item.daysRemaining > 0 && !item.warningSent);

    if (warningsToNotify.length === 0) {
      return 0;
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (admins.length === 0) {
      console.warn('⚠️ Aucun administrateur trouvé pour envoyer les alertes de rétention.');
      return 0;
    }

    // Construire le contenu HTML du mail récapitulatif
    let htmlTableRows = '';
    for (const item of warningsToNotify) {
      htmlTableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.entityType}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.action === 'DELETE' ? 'Suppression' : 'Anonymisation'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.expirationDate.toLocaleDateString('fr-CH')}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d9534f;">J-${item.daysRemaining}</td>
        </tr>
      `;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #d9534f;">Avertissement de Rétention de Données (Conformité LPD)</h2>
        <p>Bonjour,</p>
        <p>Les données suivantes vont faire l'objet d'une purge ou d'une anonymisation automatique sous 7 jours ou moins.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Type</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nom/Titre</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Action planifiée</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Date effective</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Délai restant</th>
            </tr>
          </thead>
          <tbody>
            ${htmlTableRows}
          </tbody>
        </table>
        <br/>
        <p>Si vous souhaitez conserver ces données, veuillez prolonger la durée de rétention dans les paramètres de l'entité.</p>
        <br/>
        <p>Cordialement,</p>
        <p><strong>Système de Conformité CRM</strong></p>
      </div>
    `;

    // Envoyer aux administrateurs
    for (const admin of admins) {
      await MailService.sendMail({
        to: admin.email,
        subject: `[Digitaldetectives] Avertissement de rétention de données (J-7)`,
        html,
      });
    }

    // Enregistrer les avertissements dans l'Audit Log pour éviter les doublons
    for (const item of warningsToNotify) {
      await AuditService.log({
        userId: undefined,
        action: 'RETENTION_WARNING_SENT',
        entity: item.entityType === 'MANDATE' ? 'Mandat' : 'Client',
        entityId: item.id,
        newValue: { expirationDate: item.expirationDate, action: item.action },
      });
    }

    return warningsToNotify.length;
  }

  /**
   * Exécute la purge et l'anonymisation des données expirées
   */
  static async runPurge(): Promise<{ mandatesProcessed: number; clientsProcessed: number }> {
    const report = await this.getRetentionReport();
    const expiredItems = report.filter(item => item.daysRemaining <= 0);

    let mandatesProcessed = 0;
    let clientsProcessed = 0;

    for (const item of expiredItems) {
      if (item.entityType === 'MANDATE') {
        if (item.action === 'DELETE') {
          await this.deleteMandateData(item.id);
        } else {
          await this.anonymizeMandateData(item.id);
        }
        mandatesProcessed++;
      } else if (item.entityType === 'CLIENT') {
        if (item.action === 'DELETE') {
          await this.deleteClientData(item.id);
        } else {
          await this.anonymizeClientData(item.id);
        }
        clientsProcessed++;
      }
    }

    return { mandatesProcessed, clientsProcessed };
  }

  /**
   * Supprime complètement un mandat et toutes ses pièces jointes
   */
  private static async deleteMandateData(mandatId: string) {
    console.log(`🚨 Purge de rétention : suppression complète du mandat ${mandatId}`);

    // 1. Récupérer et supprimer tous les fichiers physiques
    const files = await prisma.file.findMany({
      where: { folder: { mandatId } },
    });

    for (const file of files) {
      try {
        await StorageService.deleteFile(file.key);
      } catch (err) {
        console.error(`Erreur lors de la suppression physique du fichier ${file.key}:`, err);
      }
    }

    // 2. Transaction pour supprimer de la DB
    await prisma.$transaction(async (tx) => {
      // Supprimer les CustomFieldValues
      await tx.customFieldValue.deleteMany({
        where: { entityId: mandatId, entityType: 'MANDATE' },
      });

      // Supprimer les fichiers
      await tx.file.deleteMany({
        where: { folder: { mandatId } },
      });

      // Supprimer les dossiers (Dossiers)
      await tx.dossier.deleteMany({
        where: { mandatId },
      });

      // Supprimer les devis et leurs items
      await tx.quoteItem.deleteMany({
        where: { quote: { mandatId } },
      });
      await tx.quote.deleteMany({
        where: { mandatId },
      });

      // Supprimer les activités et suivis
      await tx.activity.deleteMany({
        where: { mandatId },
      });

      // Supprimer les time entries et assignments
      await tx.timeEntry.deleteMany({
        where: { mandatId },
      });
      await tx.mandatSubcontractor.deleteMany({
        where: { mandatId },
      });

      // Supprimer le mandat lui-même
      await tx.mandat.delete({
        where: { id: mandatId },
      });
    });

    // Enregistrer la suppression dans l'Audit Log général (preuve de conformité)
    await AuditService.log({
      userId: undefined,
      action: 'RETENTION_AUTO_DELETE',
      entity: 'Mandat',
      entityId: mandatId,
      oldValue: { id: mandatId, name: 'Données supprimées par politique de rétention' },
    });
  }

  /**
   * Anonymise un mandat et supprime ses fichiers sensibles
   */
  private static async anonymizeMandateData(mandatId: string) {
    console.log(`🔒 Purge de rétention : anonymisation du mandat ${mandatId}`);

    // Pour l'anonymisation d'un mandat, nous devons aussi supprimer les fichiers (preuves, photos, rapports)
    // car ils contiennent des visages, des plaques d'immatriculation et des informations personnelles.
    const files = await prisma.file.findMany({
      where: { folder: { mandatId } },
    });

    for (const file of files) {
      try {
        await StorageService.deleteFile(file.key);
      } catch (err) {
        console.error(`Erreur suppression physique fichier ${file.key}:`, err);
      }
    }

    await prisma.$transaction(async (tx) => {
      // Supprimer les CustomFieldValues du mandat
      await tx.customFieldValue.deleteMany({
        where: { entityId: mandatId, entityType: 'MANDATE' },
      });

      // Supprimer les enregistrements de fichiers en DB
      await tx.file.deleteMany({
        where: { folder: { mandatId } },
      });

      // Mettre à jour le mandat pour enlever les données d'identification
      await tx.mandat.update({
        where: { id: mandatId },
        data: {
          title: `MANDATE-ANON-${mandatId.substring(0, 8)}`,
          description: `Anonymisé automatiquement conformément à la LPD le ${new Date().toLocaleDateString('fr-CH')}`,
        },
      });
    });

    // Enregistrer l'anonymisation dans l'Audit Log (preuve de conformité)
    await AuditService.log({
      userId: undefined,
      action: 'RETENTION_AUTO_ANONYMIZE',
      entity: 'Mandat',
      entityId: mandatId,
    });
  }

  /**
   * Supprime complètement un client et ses mandats associés
   */
  private static async deleteClientData(clientId: string) {
    console.log(`🚨 Purge de rétention : suppression complète du client ${clientId}`);

    // Récupérer et supprimer tous ses mandats d'abord
    const mandats = await prisma.mandat.findMany({
      where: { clientId },
    });

    for (const m of mandats) {
      await this.deleteMandateData(m.id);
    }

    // Supprimer le client lui-même dans une transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les CustomFieldValues
      await tx.customFieldValue.deleteMany({
        where: { entityId: clientId, entityType: 'CLIENT' },
      });

      // Supprimer ses devis restants (s'ils existent encore)
      await tx.quoteItem.deleteMany({
        where: { quote: { clientId } },
      });
      await tx.quote.deleteMany({
        where: { clientId },
      });

      // Supprimer le client
      await tx.client.delete({
        where: { id: clientId },
      });
    });

    await AuditService.log({
      userId: undefined,
      action: 'RETENTION_AUTO_DELETE',
      entity: 'Client',
      entityId: clientId,
      oldValue: { id: clientId, name: 'Client supprimé par politique de rétention' },
    });
  }

  /**
   * Anonymise les informations d'un client
   */
  private static async anonymizeClientData(clientId: string) {
    console.log(`🔒 Purge de rétention : anonymisation du client ${clientId}`);

    // Anonymiser aussi les mandats de ce client
    const mandats = await prisma.mandat.findMany({
      where: { clientId },
    });

    for (const m of mandats) {
      await this.anonymizeMandateData(m.id);
    }

    await prisma.$transaction(async (tx) => {
      // Supprimer les CustomFieldValues du client
      await tx.customFieldValue.deleteMany({
        where: { entityId: clientId, entityType: 'CLIENT' },
      });

      // Remplacer les données personnelles par des pseudonymes
      await tx.client.update({
        where: { id: clientId },
        data: {
          firstName: 'Client',
          lastName: `Anon-${clientId.substring(0, 8)}`,
          email: `anon-${clientId.substring(0, 8)}@digitaldetectives-anon.ch`,
          phone: null,
          address: null,
          company: null,
          wpId: null, // Déconnecter de WordPress pour la sécurité
        },
      });
    });

    await AuditService.log({
      userId: undefined,
      action: 'RETENTION_AUTO_ANONYMIZE',
      entity: 'Client',
      entityId: clientId,
    });
  }
}
