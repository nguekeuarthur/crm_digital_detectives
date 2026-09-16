import { Request, Response } from 'express';
import { prisma } from '../../shared/prisma';
import { RingoverService } from './ringover.service';
import { ActivityService } from '../mandat/activity.service';
import { broadcastCallEvent } from '../../shared/websocket';
import { FileService } from '../file/file.service';

export class RingoverController {
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
   * Réception des événements de téléphonie Ringover (Webhook public)
   */
  static async handleWebhook(req: Request, res: Response) {
    const webhookSecret = process.env.RINGOVER_WEBHOOK_SECRET;
    const requestToken = (req.headers['x-ringover-token'] as string) || (req.query.token as string);

    // 1. Validation du token de sécurité
    if (webhookSecret && requestToken) {
      if (webhookSecret !== requestToken) {
        console.error('❌ [Ringover Webhook] Token de sécurité invalide.');
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).send('Token invalide');
        } else {
          console.warn('⚠️ [Ringover Webhook] Token invalide ignoré en mode développement.');
        }
      }
    }

    // Extraction robuste (Ringover envoie soit à la racine soit imbriqué dans un objet "call")
    const event = req.body.event || req.body.type;
    const callData = req.body.call || req.body;

    const callId = String(callData.call_id || callData.id || '');
    const direction = String(callData.direction || '').toLowerCase(); // 'in' ou 'out'
    const from = String(callData.from || '');
    const to = String(callData.to || '');
    const duration = parseInt(String(callData.duration || '0'));
    const status = String(callData.status || callData.state || '').toLowerCase(); // 'ringing', 'answered', 'missed', etc.

    if (!event) {
      console.warn('⚠️ [Ringover Webhook] Requête reçue sans événement.');
      return res.status(400).send('Champ event requis');
    }

    console.log(`📞 [Ringover Webhook] Événement "${event}" (ID: ${callId}, De: ${from}, Pour: ${to}, Statut: ${status})`);

    // Nous ne gérons que les appels entrants ('in') pour la pop-up de CTI
    const isIncoming = direction === 'in' || direction === 'inbound';

    if (event === 'call_started' || event === 'call.started') {
      if (isIncoming) {
        // Recherche du client correspondant par son numéro
        const client = await RingoverService.lookupClient(from);
        
        // Notification temps réel via WebSocket pour tous les navigateurs connectés
        broadcastCallEvent('RINGOVER_CALL_STARTED', {
          callId,
          phone: from,
          client: client ? {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            company: client.company,
            email: client.email
          } : null
        });
      }
    } 
    else if (event === 'call_ended' || event === 'call.ended' || event === 'call_missed' || status === 'missed') {
      // 1. Fermer la pop-up sur le frontend (seulement si c'est un appel entrant qui sonnait)
      if (isIncoming) {
        broadcastCallEvent('RINGOVER_CALL_ENDED', { callId });
      }

      // 2. Historisation en BDD s'il s'agit d'un client connu
      // Si sortant, le client est 'to'. Si entrant, le client est 'from'.
      const phoneToLookup = isIncoming ? from : to;
      const client = await RingoverService.lookupClient(phoneToLookup);
      
      if (client) {
        const mandate = await RingoverService.findMandateForCallLogging(client.id);
        
        if (mandate) {
          const actingUserId = await RingoverController.getActingUserId(mandate);
          const isMissed = event === 'call_missed' || status === 'missed' || status === 'no_answer';

          let recordingFileId: string | undefined;
          const recordingUrl = callData.recording_url;

          if (recordingUrl && !isMissed) {
            try {
              console.log(`📥 [Ringover] Téléchargement de l'enregistrement: ${recordingUrl}`);
              const response = await fetch(recordingUrl);
              if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const mimeType = response.headers.get('content-type') || 'audio/mpeg';
                const size = buffer.length;

                // Trouver le dossier "Correspondances" pour ce mandat
                const folder = await prisma.dossier.findFirst({
                  where: { mandatId: mandate.id, name: 'Correspondances' }
                });

                if (folder) {
                  const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
                  const fileName = `Appel_${direction === 'in' ? 'entrant' : 'sortant'}_${phoneToLookup}_${Date.now()}.${ext}`;
                  
                  const file = await FileService.uploadFile({
                    name: fileName,
                    buffer,
                    mimeType,
                    size,
                    folderId: folder.id,
                    userId: actingUserId
                  });
                  recordingFileId = file.id;
                  console.log(`✅ [Ringover] Enregistrement sauvegardé (Fichier ID: ${file.id})`);
                }
              }
            } catch (err) {
              console.error('❌ [Ringover] Erreur lors du téléchargement de l\'enregistrement:', err);
            }
          }

          await ActivityService.push({
            mandatId: mandate.id,
            userId: actingUserId,
            type: 'CALL',
            payload: {
              callId,
              direction: isIncoming ? 'INBOUND' : 'OUTBOUND',
              duration: isMissed ? 0 : duration,
              status: isMissed ? 'MISSED' : 'ANSWERED',
              from,
              to,
              recordingFileId
            }
          });
          console.log(`💾 [Ringover] Appel historisé pour le mandat : ${mandate.title}`);
        } else {
          console.warn(`⚠️ [Ringover] Client ${client.id} identifié, mais aucun mandat disponible pour historiser l'appel.`);
        }
      }
    }

    return res.status(200).send('OK');
  }
}
