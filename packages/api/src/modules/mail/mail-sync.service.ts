import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '../../shared/prisma';
import { FileService } from '../file/file.service';
import { ActivityService } from '../mandat/activity.service';

/**
 * Message intermédiaire parsé (commun INBOX et SENT)
 */
interface ParsedMessage {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  senderEmail: string;
  recipientEmail: string;
  direction: 'INBOUND' | 'OUTBOUND';
  inReplyTo: string | null;
  references: string | null;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    size: number;
  }>;
}

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
   * Calcule le threadId d'un email en se basant sur les headers In-Reply-To / References
   * Le threadId correspond au messageId du tout premier email de la chaîne.
   */
  private static async resolveThreadId(inReplyTo: string | null, references: string | null): Promise<string | null> {
    if (!inReplyTo && !references) return null;

    // Extraire le premier Message-ID de la chaîne References (= l'email originel)
    if (references) {
      const refIds = references.split(/\s+/).filter(Boolean);
      if (refIds.length > 0) {
        const firstRef = refIds[0];
        // Vérifier si cet email existe en base et a un threadId
        const rootEmail = await prisma.email.findUnique({
          where: { messageId: firstRef },
          select: { threadId: true, messageId: true }
        });
        if (rootEmail) {
          return rootEmail.threadId || rootEmail.messageId;
        }
        return firstRef; // Utiliser le premier reference comme threadId même s'il n'est pas en base
      }
    }

    // Fallback: utiliser inReplyTo
    if (inReplyTo) {
      const parentEmail = await prisma.email.findUnique({
        where: { messageId: inReplyTo },
        select: { threadId: true, messageId: true }
      });
      if (parentEmail) {
        return parentEmail.threadId || parentEmail.messageId;
      }
      return inReplyTo;
    }

    return null;
  }

  /**
   * Récupère les messages d'un dossier IMAP donné
   */
  private static async fetchFromFolder(
    client: ImapFlow,
    folderName: string,
    sinceDate: Date,
    direction: 'INBOUND' | 'OUTBOUND'
  ): Promise<ParsedMessage[]> {
    const messages: ParsedMessage[] = [];

    try {
      const lock = await client.getMailboxLock(folderName);

      try {
        const uids = await client.search({ since: sinceDate }, { uid: true });

        if (uids && Array.isArray(uids) && uids.length > 0) {
          const messagesStream = await client.fetch(uids, { source: true, envelope: true }, { uid: true });

          for await (const message of messagesStream) {
            if (!message.source) continue;

            try {
              const parsed = await simpleParser(message.source);

              // Déterminer le Message-ID unique
              const messageId = parsed.messageId || message.envelope?.messageId || `imap-uid-${folderName}-${message.uid}`;

              // Extraire l'adresse de l'expéditeur
              let senderEmail = '';
              if (parsed.from && Array.isArray(parsed.from.value) && parsed.from.value.length > 0) {
                senderEmail = parsed.from.value[0].address || '';
              } else if (parsed.from && typeof parsed.from === 'object') {
                senderEmail = this.extractEmail(parsed.from.text) || '';
              }
              senderEmail = senderEmail.trim().toLowerCase();

              // Extraire l'adresse du destinataire
              let recipientEmail = '';
              if (parsed.to) {
                if (typeof parsed.to === 'string') {
                  recipientEmail = this.extractEmail(parsed.to) || parsed.to;
                } else if (Array.isArray(parsed.to) && parsed.to.length > 0) {
                  const first = parsed.to[0];
                  if (first && typeof first === 'object' && 'value' in first) {
                    recipientEmail = first.value?.[0]?.address || '';
                  }
                } else if (typeof parsed.to === 'object' && 'value' in parsed.to) {
                  recipientEmail = parsed.to.value?.[0]?.address || '';
                }
              }
              recipientEmail = recipientEmail.trim().toLowerCase();

              // Formater le destinataire (texte complet)
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

              // Extraire les headers de threading
              const inReplyTo = parsed.inReplyTo || null;
              const references = parsed.references
                ? (Array.isArray(parsed.references) ? parsed.references.join(' ') : parsed.references)
                : null;

              // Mettre en forme les pièces jointes
              const attachments = (parsed.attachments || []).map(att => ({
                filename: att.filename || 'sans-nom',
                content: att.content,
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || att.content.length
              }));

              messages.push({
                messageId,
                from: parsed.from?.text || senderEmail,
                to: toStr,
                subject: parsed.subject || '(Sans objet)',
                body: parsed.html || parsed.text || '',
                date: parsed.date || new Date(),
                senderEmail,
                recipientEmail,
                direction,
                inReplyTo,
                references,
                attachments
              });
            } catch (parseErr) {
              console.error(`❌ [IMAP] Erreur lors du parsing du message UID ${message.uid} (dossier ${folderName}) :`, parseErr);
            }
          }
        }
      } finally {
        lock.release();
      }
    } catch (folderErr) {
      console.warn(`⚠️ [IMAP] Impossible d'accéder au dossier "${folderName}" :`, folderErr);
    }

    return messages;
  }

  /**
   * Synchronise les emails depuis la boîte IMAP (INBOX + SENT)
   */
  static async syncEmails(searchWindowDays = 3): Promise<{ totalFetched: number; newEmailsSaved: number }> {
    console.log(`📬 [IMAP] Début de la synchronisation bidirectionnelle (fenêtre : ${searchWindowDays} jours)...`);

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

    let parsedMessages: ParsedMessage[] = [];

    // 1. Connexion et récupération des messages INBOX + SENT
    try {
      await client.connect();
      const sinceDate = new Date(Date.now() - searchWindowDays * 24 * 3600 * 1000);

      // 1a. Récupérer les emails entrants (INBOX)
      const inboxMessages = await this.fetchFromFolder(client, 'INBOX', sinceDate, 'INBOUND');
      console.log(`📥 [IMAP] ${inboxMessages.length} messages récupérés depuis INBOX`);

      // 1b. Récupérer les emails envoyés (SENT)
      // Les noms de dossier SENT varient selon le serveur : essayer les noms courants
      const sentFolderNames = ['Sent', 'INBOX.Sent', 'Sent Messages', 'Éléments envoyés'];
      let sentMessages: ParsedMessage[] = [];

      for (const folderName of sentFolderNames) {
        sentMessages = await this.fetchFromFolder(client, folderName, sinceDate, 'OUTBOUND');
        if (sentMessages.length > 0) {
          console.log(`📤 [IMAP] ${sentMessages.length} messages récupérés depuis ${folderName}`);
          break;
        }
      }

      // Si aucun dossier SENT n'a fonctionné, on log un avertissement mais on continue
      if (sentMessages.length === 0) {
        console.log(`📤 [IMAP] Aucun email envoyé trouvé dans les dossiers SENT (ou dossier vide)`);
      }

      parsedMessages = [...inboxMessages, ...sentMessages];

      await client.logout();
    } catch (connErr) {
      console.error('❌ [IMAP] Erreur lors de la connexion ou de la lecture IMAP :', connErr);
      return { totalFetched: 0, newEmailsSaved: 0 };
    }

    // 2. Traitement en base de données et stockage physique des e-mails
    let newEmailsSaved = 0;

    for (const msg of parsedMessages) {
      try {
        // Vérification de doublon par Message-ID
        const existing = await prisma.email.findUnique({
          where: { messageId: msg.messageId }
        });

        if (existing) continue;

        // Résoudre le threadId pour le fil de conversation
        const threadId = await this.resolveThreadId(msg.inReplyTo, msg.references);

        // Déterminer l'adresse du client selon la direction :
        // - INBOUND : le client est l'expéditeur
        // - OUTBOUND : le client est le destinataire
        const clientEmailToSearch = msg.direction === 'INBOUND' ? msg.senderEmail : msg.recipientEmail;

        // Recherche du client par email
        const clientMatch = clientEmailToSearch
          ? await prisma.client.findFirst({
              where: {
                email: {
                  equals: clientEmailToSearch,
                  mode: 'insensitive'
                }
              }
            })
          : null;

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

            // Enregistrer chaque pièce jointe (uniquement pour les emails entrants ou avec pièces jointes)
            if (msg.direction === 'INBOUND') {
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
            }

            // Enregistrer l'e-mail lié au client et au mandat
            const emailRecord = await prisma.email.create({
              data: {
                messageId: msg.messageId,
                from: msg.from,
                to: msg.to,
                subject: msg.subject,
                body: msg.body,
                direction: msg.direction,
                receivedAt: msg.date,
                threadId,
                inReplyTo: msg.inReplyTo,
                references: msg.references,
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
                direction: msg.direction,
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
                direction: msg.direction,
                receivedAt: msg.date,
                threadId,
                inReplyTo: msg.inReplyTo,
                references: msg.references,
                clientId: clientMatch.id,
                mandatId: null
              }
            });
          }
        } else {
          // Expéditeur/destinataire inconnu : email non lié à un client
          await prisma.email.create({
            data: {
              messageId: msg.messageId,
              from: msg.from,
              to: msg.to,
              subject: msg.subject,
              body: msg.body,
              direction: msg.direction,
              receivedAt: msg.date,
              threadId,
              inReplyTo: msg.inReplyTo,
              references: msg.references,
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

    console.log(`✅ [IMAP] Synchronisation bidirectionnelle terminée. ${parsedMessages.length} e-mails traités, ${newEmailsSaved} nouveaux e-mails enregistrés.`);
    return { totalFetched: parsedMessages.length, newEmailsSaved };
  }
}
