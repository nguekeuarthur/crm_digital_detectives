import fs from 'fs';
import path from 'path';
// @ts-expect-error archiver v8 ESM typings are missing
import { ZipArchive } from 'archiver';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../shared/prisma';
import { StorageService } from '../file/storage.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

const EXPORTS_DIR = path.join(process.env.STORAGE_PATH || './uploads', 'exports');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-12345';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export class ExportService {
  private static ensureExportsDir() {
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }
  }

  /**
   * Lance la génération de l'export d'un mandat en arrière-plan
   */
  static async generateMandateExport(mandateId: string, userId: string, userEmail: string): Promise<string> {
    this.ensureExportsDir();
    const exportId = crypto.randomUUID();
    this.runMandateExportBackground(exportId, mandateId, userId, userEmail).catch(err => {
      console.error(`[EXPORT] Erreur survenue lors de l'export du mandat ${mandateId}:`, err);
    });
    return exportId;
  }

  /**
   * Lance la génération de l'export d'un client en arrière-plan
   */
  static async generateClientExport(clientId: string, userId: string, userEmail: string): Promise<string> {
    this.ensureExportsDir();
    const exportId = crypto.randomUUID();
    this.runClientExportBackground(exportId, clientId, userId, userEmail).catch(err => {
      console.error(`[EXPORT] Erreur survenue lors de l'export du client ${clientId}:`, err);
    });
    return exportId;
  }

  /**
   * Lance la génération de l'export global en arrière-plan
   */
  static async generateGlobalExport(userId: string, userEmail: string): Promise<string> {
    this.ensureExportsDir();
    const exportId = crypto.randomUUID();
    this.runGlobalExportBackground(exportId, userId, userEmail).catch(err => {
      console.error(`[EXPORT] Erreur survenue lors de l'export global:`, err);
    });
    return exportId;
  }

  /**
   * Nettoie les fichiers ZIP d'export expirés (> 24h)
   */
  static async cleanupExports() {
    this.ensureExportsDir();
    const files = fs.readdirSync(EXPORTS_DIR);
    const now = Date.now();
    const MaxAge = 24 * 60 * 60 * 1000; // 24 heures

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = path.join(EXPORTS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > MaxAge) {
            fs.unlinkSync(filePath);
            console.log(`🧹 [CLEANUP] Supprimé l'export expiré : ${file}`);
          }
        } catch (err) {
          console.error(`❌ [CLEANUP] Erreur nettoyage fichier ${file} :`, err);
        }
      }
    }
  }

  // --- TRAITEMENTS DE FOND ---

  private static async runMandateExportBackground(exportId: string, mandateId: string, userId: string, userEmail: string) {
    const zipPath = path.join(EXPORTS_DIR, `${exportId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.pipe(output);

    try {
      const mandat = await prisma.mandat.findUnique({
        where: { id: mandateId },
        include: {
          client: true,
          dossiers: {
            include: { files: { where: { deletedAt: null } } }
          },
          activities: true
        }
      });

      if (!mandat) {
        throw new Error('Mandat non trouvé');
      }

      const metadata = {
        exportId,
        exportedAt: new Date().toISOString(),
        entityType: 'MANDATE',
        mandate: {
          id: mandat.id,
          title: mandat.title,
          description: mandat.description,
          status: mandat.status,
          createdAt: mandat.createdAt,
          updatedAt: mandat.updatedAt,
          client: {
            id: mandat.client.id,
            firstName: mandat.client.firstName,
            lastName: mandat.client.lastName,
            email: mandat.client.email
          },
          activities: mandat.activities
        }
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

      for (const dossier of mandat.dossiers) {
        const safeFolderName = dossier.name.replace(/[/\\?%*:|"<>]/g, '-');
        for (const file of dossier.files) {
          try {
            const buffer = await StorageService.getFile(file.key);
            const safeFileName = file.name.replace(/[/\\?%*:|"<>]/g, '-');
            archive.append(buffer, { name: `folders/${safeFolderName}/${safeFileName}` });
          } catch (err) {
            console.error(`❌ [EXPORT] Erreur fichier ${file.key}:`, err);
            archive.append(`Erreur de déchiffrement pour le fichier ${file.name}: ${err instanceof Error ? err.message : String(err)}`, { name: `errors/${file.name}.txt` });
          }
        }
      }

      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      const token = jwt.sign({ exportId, userId }, JWT_SECRET, { expiresIn: '24h' });
      const downloadUrl = `${APP_URL}/api/v1/files/download-export/${exportId}?token=${token}`;

      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Votre export pour le mandat "${mandat.title}" est prêt`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Votre export de données est prêt</h2>
            <p>L'exportation des données pour le mandat <strong>"${mandat.title}"</strong> a été générée avec succès.</p>
            <p>Cliquez sur le lien ci-dessous pour télécharger le fichier ZIP (valable 24 heures) :</p>
            <p style="margin: 20px 0;">
              <a href="${downloadUrl}" style="background-color: #1a1a2e; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Télécharger l'export (ZIP)</a>
            </p>
            <p style="font-size: 12px; color: #666;">Lien de téléchargement direct : <br/> <a href="${downloadUrl}">${downloadUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999;">Attention : Cet export contient des preuves et des informations personnelles. Traitez-les en conformité avec la LPD et le RGPD.</p>
          </div>
        `
      });

      await AuditService.log({
        userId,
        action: 'EXPORT_MANDATE',
        entity: 'Mandat',
        entityId: mandateId,
        newValue: { exportId }
      });

    } catch (err) {
      console.error(`❌ [EXPORT] Échec export mandat ${exportId}:`, err);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Échec de génération de votre export`,
        html: `<p>Une erreur est survenue lors de l'exportation : ${err instanceof Error ? err.message : String(err)}</p>`
      });
    }
  }

  private static async runClientExportBackground(exportId: string, clientId: string, userId: string, userEmail: string) {
    const zipPath = path.join(EXPORTS_DIR, `${exportId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.pipe(output);

    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          mandats: {
            where: { deletedAt: null },
            include: {
              dossiers: {
                include: { files: { where: { deletedAt: null } } }
              },
              activities: true
            }
          }
        }
      });

      if (!client) {
        throw new Error('Client non trouvé');
      }

      const metadata = {
        exportId,
        exportedAt: new Date().toISOString(),
        entityType: 'CLIENT',
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          company: client.company,
          status: client.status,
          createdAt: client.createdAt,
          mandates: client.mandats.map(m => ({
            id: m.id,
            title: m.title,
            description: m.description,
            status: m.status,
            createdAt: m.createdAt,
            activities: m.activities
          }))
        }
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

      for (const mandat of client.mandats) {
        const safeMandateTitle = mandat.title.replace(/[/\\?%*:|"<>]/g, '-');
        for (const dossier of mandat.dossiers) {
          const safeFolderName = dossier.name.replace(/[/\\?%*:|"<>]/g, '-');
          for (const file of dossier.files) {
            try {
              const buffer = await StorageService.getFile(file.key);
              const safeFileName = file.name.replace(/[/\\?%*:|"<>]/g, '-');
              archive.append(buffer, {
                name: `mandates/${safeMandateTitle}/${safeFolderName}/${safeFileName}`
              });
            } catch (err) {
              console.error(`❌ [EXPORT] Erreur fichier client ${file.key}:`, err);
              archive.append(`Erreur de déchiffrement pour ${file.name} (Clé: ${file.key}): ${err instanceof Error ? err.message : String(err)}`, {
                name: `errors/${safeMandateTitle}_${file.name}.txt`
              });
            }
          }
        }
      }

      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      const token = jwt.sign({ exportId, userId }, JWT_SECRET, { expiresIn: '24h' });
      const downloadUrl = `${APP_URL}/api/v1/files/download-export/${exportId}?token=${token}`;

      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Votre export pour le client "${client.firstName} ${client.lastName}" est prêt`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Votre export de données est prêt</h2>
            <p>L'exportation des données pour le client <strong>"${client.firstName} ${client.lastName}"</strong> a été générée avec succès.</p>
            <p>Cliquez sur le lien ci-dessous pour télécharger le fichier ZIP (valable 24 heures) :</p>
            <p style="margin: 20px 0;">
              <a href="${downloadUrl}" style="background-color: #1a1a2e; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Télécharger l'export (ZIP)</a>
            </p>
            <p style="font-size: 12px; color: #666;">Lien de téléchargement direct : <br/> <a href="${downloadUrl}">${downloadUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999;">Attention : Cet export contient des preuves et des informations personnelles. Traitez-les en conformité avec la LPD et le RGPD.</p>
          </div>
        `
      });

      await AuditService.log({
        userId,
        action: 'EXPORT_CLIENT',
        entity: 'Client',
        entityId: clientId,
        newValue: { exportId }
      });

    } catch (err) {
      console.error(`❌ [EXPORT] Échec export client ${exportId}:`, err);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Échec de génération de votre export`,
        html: `<p>Une erreur est survenue lors de l'exportation client : ${err instanceof Error ? err.message : String(err)}</p>`
      });
    }
  }

  private static async runGlobalExportBackground(exportId: string, userId: string, userEmail: string) {
    const zipPath = path.join(EXPORTS_DIR, `${exportId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.pipe(output);

    try {
      const clients = await prisma.client.findMany({
        where: { deletedAt: null },
        include: {
          mandats: {
            where: { deletedAt: null },
            include: {
              dossiers: {
                include: { files: { where: { deletedAt: null } } }
              },
              activities: true
            }
          }
        }
      });

      const auditLogs = await prisma.auditLog.findMany({
        take: 5000,
        orderBy: { createdAt: 'desc' }
      });

      const metadata = {
        exportId,
        exportedAt: new Date().toISOString(),
        entityType: 'GLOBAL',
        clientsCount: clients.length,
        auditLogsCount: auditLogs.length
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
      archive.append(JSON.stringify(auditLogs, null, 2), { name: 'audit_logs.json' });

      for (const client of clients) {
        const safeClientName = `${client.firstName}_${client.lastName}`.replace(/[/\\?%*:|"<>]/g, '-');
        
        const clientMeta = {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          company: client.company,
          status: client.status,
          createdAt: client.createdAt
        };
        archive.append(JSON.stringify(clientMeta, null, 2), { name: `clients/${safeClientName}/client_metadata.json` });

        for (const mandat of client.mandats) {
          const safeMandateTitle = mandat.title.replace(/[/\\?%*:|"<>]/g, '-');
          
          const mandateMeta = {
            id: mandat.id,
            title: mandat.title,
            description: mandat.description,
            status: mandat.status,
            createdAt: mandat.createdAt,
            activities: mandat.activities
          };
          archive.append(JSON.stringify(mandateMeta, null, 2), { name: `clients/${safeClientName}/mandates/${safeMandateTitle}/mandate_metadata.json` });

          for (const dossier of mandat.dossiers) {
            const safeFolderName = dossier.name.replace(/[/\\?%*:|"<>]/g, '-');
            for (const file of dossier.files) {
              try {
                const buffer = await StorageService.getFile(file.key);
                const safeFileName = file.name.replace(/[/\\?%*:|"<>]/g, '-');
                archive.append(buffer, {
                  name: `clients/${safeClientName}/mandates/${safeMandateTitle}/folders/${safeFolderName}/${safeFileName}`
                });
              } catch (err) {
                console.error(`❌ [EXPORT] Erreur fichier global ${file.key}:`, err);
                archive.append(`Erreur de déchiffrement pour ${file.name} (Clé: ${file.key}): ${err instanceof Error ? err.message : String(err)}`, {
                  name: `errors/${safeClientName}_${safeMandateTitle}_${file.name}.txt`
                });
              }
            }
          }
        }
      }

      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      const token = jwt.sign({ exportId, userId }, JWT_SECRET, { expiresIn: '24h' });
      const downloadUrl = `${APP_URL}/api/v1/files/download-export/${exportId}?token=${token}`;

      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Votre export global de la base de données est prêt`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Votre export global de sauvegarde est prêt</h2>
            <p>L'exportation complète de toutes les données du CRM (Clients, Mandats, Fichiers déchiffrés, Logs d'audit) a été générée avec succès.</p>
            <p>Cliquez sur le lien ci-dessous pour télécharger le fichier ZIP (valable 24 heures) :</p>
            <p style="margin: 20px 0;">
              <a href="${downloadUrl}" style="background-color: #d9534f; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Télécharger la Sauvegarde Globale (ZIP)</a>
            </p>
            <p style="font-size: 12px; color: #666;">Lien de téléchargement direct : <br/> <a href="${downloadUrl}">${downloadUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #999; font-weight: bold;">AVERTISSEMENT CRITIQUE : Ce fichier contient toutes les données sensibles du CRM. Stockez-le de manière extrêmement sécurisée et chiffrez l'archive locale si nécessaire.</p>
          </div>
        `
      });

      await AuditService.log({
        userId,
        action: 'EXPORT_GLOBAL',
        entity: 'System',
        entityId: undefined,
        newValue: { exportId }
      });

    } catch (err) {
      console.error(`❌ [EXPORT] Échec export global ${exportId}:`, err);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      await MailService.sendMail({
        to: userEmail,
        subject: `[Digitaldetectives] Échec de génération de votre export global`,
        html: `<p>Une erreur est survenue lors de l'exportation globale : ${err instanceof Error ? err.message : String(err)}</p>`
      });
    }
  }
}
