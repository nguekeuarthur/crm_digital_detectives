import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { prisma } from '../../shared/prisma';
import { WhatsappService } from './whatsapp.service';
import { FileService } from '../file/file.service';
import { ActivityService } from '../mandat/activity.service';

export class WhatsappController {
  /**
   * Helper pour résoudre un identifiant d'utilisateur actif en arrière-plan pour le fil d'activité
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
   * Réception d'un message WhatsApp depuis Twilio (Webhook public)
   */
  static async handleWebhook(req: Request, res: Response) {
    const signature = req.headers['x-twilio-signature'] as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    // 1. Validation de signature Twilio (uniquement si configuré pour autoriser le dev)
    if (authToken && signature) {
      const protocol = req.headers['x-forwarded-proto'] as string || req.protocol;
      const host = req.headers['x-forwarded-host'] as string || req.get('host');
      const absoluteUrl = `${protocol}://${host}${req.originalUrl}`;
      
      const isValid = WhatsappService.validateSignature(authToken, signature, absoluteUrl, req.body);
      if (!isValid) {
        console.error('❌ [Twilio Webhook] Signature invalide.');
        return res.status(403).send('Signature invalide');
      }
    }

    const { From, To, Body, MessageSid, NumMedia = '0' } = req.body;

    if (!From || !Body) {
      console.warn('⚠️ [Twilio Webhook] Requête reçue sans expéditeur ou sans corps.');
      return res.status(400).send('Champs From et Body requis');
    }

    console.log(`💬 [WhatsApp] Message reçu de ${From} (SID: ${MessageSid}) : "${Body}"`);

    // 2. Recherche du client correspondant par son numéro de téléphone
    const clients = await prisma.client.findMany({
      where: { phone: { not: null }, deletedAt: null },
      select: { id: true, phone: true }
    });

    const clientMatch = clients.find(c => WhatsappService.matchPhone(c.phone!, From));

    if (!clientMatch) {
      console.warn(`⚠️ [WhatsApp] Aucun client trouvé pour le numéro : ${From}. Message ignoré.`);
      // On retourne 200 pour éviter que Twilio ne continue de retry
      return res.status(200).send('Client non trouvé');
    }

    // 3. Recherche du dernier mandat actif du client
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

    if (!activeMandat) {
      console.warn(`⚠️ [WhatsApp] Aucun mandat actif trouvé pour le client ${clientMatch.id}. Message non historisé.`);
      return res.status(200).send('Aucun mandat actif pour ce client');
    }

    const actingUserId = await this.getActingUserId(activeMandat);
    const mediaCount = parseInt(String(NumMedia));
    const mediaInfoList: Array<{ name: string; key: string; size: number; mimeType: string }> = [];

    // 4. Téléchargement et classement des pièces jointes
    for (let i = 0; i < mediaCount; i++) {
      const mediaUrl = req.body[`MediaUrl${i}`];
      const mimeType = req.body[`MediaContentType${i}`];
      
      if (mediaUrl) {
        try {
          console.log(`📥 [WhatsApp Webhook] Téléchargement du média ${i} (${mimeType}) depuis ${mediaUrl}...`);
          
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Échec du téléchargement (HTTP ${response.status})`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Déterminer le dossier cible en fonction du type MIME
          let folderName = 'Correspondances';
          if (mimeType.startsWith('image/')) {
            folderName = 'Preuves Photographiques';
          } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
            folderName = 'Vidéos et Audios';
          }

          // Trouver ou créer le dossier système pour le mandat
          let folder = await prisma.dossier.findFirst({
            where: { mandatId: activeMandat.id, name: folderName }
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

          // Générer un nom de fichier unique et expressif
          const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
          const filename = `whatsapp_${MessageSid || Date.now()}_${i}.${ext}`;

          // Uploader le fichier
          const savedFile = await FileService.uploadFile({
            name: filename,
            buffer,
            mimeType,
            size: buffer.length,
            folderId: folder.id,
            userId: actingUserId
          });

          mediaInfoList.push({
            name: filename,
            key: savedFile.key,
            size: buffer.length,
            mimeType
          });
        } catch (mediaErr) {
          console.error(`❌ [WhatsApp Webhook] Erreur lors du traitement du média ${i} :`, mediaErr);
        }
      }
    }

    // 5. Historisation du message WhatsApp dans le fil d'activité
    await ActivityService.push({
      mandatId: activeMandat.id,
      userId: actingUserId,
      type: 'WHATSAPP',
      payload: {
        messageSid: MessageSid,
        from: From,
        to: To,
        body: Body,
        direction: 'INBOUND',
        media: mediaInfoList
      }
    });

    console.log(`💾 [WhatsApp] Message historisé pour le mandat : ${activeMandat.title}`);
    return res.status(200).send('OK');
  }

  /**
   * Envoyer un message WhatsApp depuis le CRM (Endpoint protégé)
   */
  static async sendWhatsApp(req: AuthRequest, res: Response) {
    const { clientId, body, mandatId } = req.body;

    if (!clientId || !body) {
      return res.status(400).json({ error: 'Les champs "clientId" et "body" sont requis' });
    }

    // 1. Récupération du client et de son numéro de téléphone
    const client = await prisma.client.findUnique({
      where: { id: clientId, deletedAt: null }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    if (!client.phone) {
      return res.status(400).json({ error: 'Le client ne possède pas de numéro de téléphone enregistré' });
    }

    // 2. Recherche du mandat associé (mandatId ou dernier mandat actif)
    let activeMandatId = mandatId;
    if (!activeMandatId) {
      const lastActive = await prisma.mandat.findFirst({
        where: {
          clientId,
          status: { notIn: ['TERMINE', 'ANNULE'] },
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });
      if (!lastActive) {
        return res.status(400).json({ error: 'Aucun mandat actif trouvé pour associer le message WhatsApp' });
      }
      activeMandatId = lastActive.id;
    } else {
      const exists = await prisma.mandat.findUnique({
        where: { id: activeMandatId, clientId }
      });
      if (!exists) {
        return res.status(404).json({ error: 'Mandat spécifié introuvable ou non lié à ce client' });
      }
    }

    const recipientNumber = client.phone;

    try {
      // 3. Appel de l'envoi Twilio
      const twilioRes = await WhatsappService.sendMessage({
        to: recipientNumber,
        body
      });

      // 4. Historisation dans le fil d'activité
      const currentUserId = req.user!.userId;
      await ActivityService.push({
        mandatId: activeMandatId,
        userId: currentUserId,
        type: 'WHATSAPP',
        payload: {
          messageSid: twilioRes.sid,
          from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          to: recipientNumber,
          body,
          direction: 'OUTBOUND',
          media: []
        }
      });

      return res.json({
        success: true,
        message: 'Message WhatsApp envoyé et historisé',
        messageSid: twilioRes.sid,
        status: twilioRes.status
      });
    } catch (err) {
      console.error('❌ [WhatsApp Outbound] Échec de l\'envoi Twilio :', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        error: 'Échec de l\'envoi du message via Twilio',
        details: errMsg
      });
    }
  }
}
