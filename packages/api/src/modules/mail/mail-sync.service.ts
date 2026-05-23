import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../../shared/prisma';
import { FileService } from '../file/file.service';
import { ActivityService } from '../mandat/activity.service';

export class MailSyncService {
  /**
   * Extrait l'adresse email propre d'une chaîne "Nom <email@domain.com>" ou brute
   */
  private static extractEmail(fromText: string | undefined): string | null {
    if (!fromText) return null;
    const match = fromText.match(/<([^>]+)>/);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
    return fromText.trim().toLowerCase();
  }

  /**
   * Résout un identifiant d'utilisateur actif pour le fil d'activité
   */
  private static async getActingUserId(mandat: { enqueteurId: string | null }): Promise<string> {
    if (mandat.enqueteurId) {
      return mandat.enqueteurId;
    }
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    if (admin) {
      return admin.id;
    }
    const firstUser = await prisma.user.findFirst();
    return firstUser?.id || '';
  }

  /**
   * Synchronise les emails depuis la boîte IMAP
   */
  static async syncEmails(searchWindowDays = 3): Promise<{ totalFetched: number; newEmailsSaved: number }> {
    console.log(`📬 [IMAP] Début de la synchronisation des e-mails (fenêtre : ${searchWindowDays} jours)...`);

    const host = process.env.IMAP_HOST || 'mail.infomaniak.com';
    const port = parseInt(process.env.IMAP_PORT || '993');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn('⚠️ [IMAP] Identifiants SMTP_USER ou SMTP_PASS non configurés dans le fichier .env. Synchronisation annulée.');
      return { totalFetched: 0, newEmailsSaved: 0 };
    }

    const client = new ImapFlow({
      host,
      port,
      secure: true,
      auth: { user, pass },
      logger: false
    });

    const parsedMessages: Array<{
      messageId: string;
      from: string;
      to: string;
      subject: string;
      body: string;
      date: Date;
      senderEmail: string;
      attachments: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
        size: number;
      }>;
    }> = [];

    // 1. Connexion et récupération des messages depuis IMAP
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const sinceDate = new Date(Date.now() - searchWindowDays * 24 * 3600 * 1000);
        // Recherche des messages récents (UID: true)
        const uids = await client.search({ since: sinceDate }, { uid: true });

        if (uids && Array.isArray(uids) && uids.length > 0) {
          // fetch all sources to process without deadlock
          const messagesStream = await client.fetch(uids, { source: true, envelope: true }, { uid: true });

          for await (const message of messagesStream) {
            if (!message.source) continue;

            try {
              const parsed = await simpleParser(message.source);
              
              // Déterminer le Message-ID unique
              const messageId = parsed.messageId || message.envelope?.messageId || `imap-uid-${message.uid}`;
              
              // Extraire l'adresse de l'expéditeur
              let senderEmail = '';
              if (parsed.from && Array.isArray(parsed.from.value) && parsed.from.value.length > 0) {
                senderEmail = parsed.from.value[0].address || '';
              } else if (parsed.from && typeof parsed.from === 'object') {
                senderEmail = this.extractEmail(parsed.from.text) || '';
              }
              senderEmail = senderEmail.trim().toLowerCase();

              // Formater le destinataire
              let toStr = '';
              if (parsed.to) {
                if (typeof parsed.to === 'string') {
                  toStr = parsed.to;
                } else if (Array.isArray(parsed.to)) {
                  toStr = parsed.to
                    .map((t) => (t && typeof t === 'object' && 'text' in t ? (t as { text?: string }).text || '' : ''))
                    .filter(Boolean)
                    .join(', ');
                } else if (typeof parsed.to === 'object' && 'text' in parsed.to) {
                  toStr = (parsed.to as { text?: string }).text || '';
                }
              }

              // Mettre en forme les pièces jointes
              const attachments = (parsed.attachments || []).map(att => ({
                filename: att.filename || 'sans-nom',
                content: att.content, // Buffer
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || att.content.length
              }));

              parsedMessages.push({
                messageId,
                from: parsed.from?.text || senderEmail,
                to: toStr,
                subject: parsed.subject || '(Sans objet)',
                body: parsed.html || parsed.text || '',
                date: parsed.date || new Date(),
                senderEmail,
                attachments
              });
            } catch (parseErr) {
              console.error(`❌ [IMAP] Erreur lors du parsing du message UID ${message.uid} :`, parseErr);
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (connErr) {
      console.error('❌ [IMAP] Erreur lors de la connexion ou de la lecture IMAP :', connErr);
      return { totalFetched: 0, newEmailsSaved: 0 };
    }

    // 2. Traitement en base de données et stockage physique des e-mails
    let newEmailsSaved = 0;

    for (const msg of parsedMessages) {
      try {
        // Vérification de doublon
        const existing = await prisma.email.findUnique({
          where: { messageId: msg.messageId }
        });

        if (existing) continue;

        // Recherche du client par email expéditeur
        const clientMatch = await prisma.client.findFirst({
          where: {
            email: {
              equals: msg.senderEmail,
              mode: 'insensitive'
            }
          }
        });

        if (clientMatch) {
          // Recherche du dernier mandat actif du client
          const activeMandat = await prisma.mandat.findFirst({
            where: {
              clientId: clientMatch.id,
              status: {
                notIn: ['TERMINE', 'ANNULE']
              },
              deletedAt: null
            },
            orderBy: { createdAt: 'desc' }
          });

          if (activeMandat) {
            // Trouver ou créer le dossier système "Échanges clients" du mandat
            const folderName = 'Échanges clients';
            let folder = await prisma.dossier.findFirst({
              where: {
                mandatId: activeMandat.id,
                name: folderName
              }
            });

            if (!folder) {
              folder = await prisma.dossier.create({
                data: {
                  name: folderName,
                  mandatId: activeMandat.id,
                  isSystem: true
                }
              });
            }

            const actingUserId = await this.getActingUserId(activeMandat);

            // Enregistrer chaque pièce jointe
            for (const att of msg.attachments) {
              try {
                await FileService.uploadFile({
                  name: att.filename,
                  buffer: att.content,
                  mimeType: att.contentType,
                  size: att.size,
                  folderId: folder.id,
                  userId: actingUserId
                });
              } catch (uploadErr) {
                console.error(`❌ [IMAP] Erreur d'enregistrement de la pièce jointe ${att.filename} pour le mandat ${activeMandat.id} :`, uploadErr);
              }
            }

            // Enregistrer l'e-mail lié au client et au mandat
            const emailRecord = await prisma.email.create({
              data: {
                messageId: msg.messageId,
                from: msg.from,
                to: msg.to,
                subject: msg.subject,
                body: msg.body,
                receivedAt: msg.date,
                clientId: clientMatch.id,
                mandatId: activeMandat.id
              }
            });

            // Ajouter au fil d'activité du mandat
            await ActivityService.push({
              mandatId: activeMandat.id,
              userId: actingUserId,
              type: 'EMAIL',
              payload: {
                emailId: emailRecord.id,
                subject: emailRecord.subject,
                from: emailRecord.from,
                hasAttachments: msg.attachments.length > 0
              }
            });
          } else {
            // Pas de mandat actif trouvé : lié uniquement au client
            await prisma.email.create({
              data: {
                messageId: msg.messageId,
                from: msg.from,
                to: msg.to,
                subject: msg.subject,
                body: msg.body,
                receivedAt: msg.date,
                clientId: clientMatch.id,
                mandatId: null
              }
            });
          }
        } else {
          // Expéditeur inconnu : email non lié à un client
          await prisma.email.create({
            data: {
              messageId: msg.messageId,
              from: msg.from,
              to: msg.to,
              subject: msg.subject,
              body: msg.body,
              receivedAt: msg.date,
              clientId: null,
              mandatId: null
            }
          });
        }

        newEmailsSaved++;
      } catch (dbErr) {
        console.error(`❌ [IMAP] Erreur lors du stockage en base de données de l'email ${msg.messageId} :`, dbErr);
      }
    }

    console.log(`✅ [IMAP] Synchronisation terminée. ${parsedMessages.length} e-mails traités, ${newEmailsSaved} nouveaux e-mails enregistrés.`);
    return { totalFetched: parsedMessages.length, newEmailsSaved };
  }
}
