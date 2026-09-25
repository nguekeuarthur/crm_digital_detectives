import { Router } from 'express';
import { WhatsappController } from './whatsapp.controller';
import { authorize } from '../../shared/middlewares';

const publicRouter = Router();
const protectedRouter = Router();

/**
 * @openapi
 * /webhooks/whatsapp:
 *   post:
 *     summary: Réception d'un message WhatsApp depuis Twilio (Webhook public)
 *     tags: [WhatsApp]
 *     description: Appelé par Twilio lorsqu'un client envoie un message WhatsApp. Gère le parsing, le téléchargement des médias et l'historisation sous forme d'activité de mandat.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [From, Body]
 *             properties:
 *               MessageSid:
 *                 type: string
 *                 description: L'ID unique du message Twilio
 *               From:
 *                 type: string
 *                 description: Numéro de l'expéditeur au format whatsapp:+[numéro]
 *               To:
 *                 type: string
 *                 description: Numéro du destinataire au format whatsapp:+[numéro]
 *               Body:
 *                 type: string
 *                 description: Contenu textuel du message
 *               NumMedia:
 *                 type: string
 *                 description: Nombre de pièces jointes médias associées
 *     responses:
 *       200:
 *         description: Message traité ou ignoré avec succès (pour arrêter les retries Twilio)
 *       403:
 *         description: Signature Twilio invalide
 *       400:
 *         description: Paramètres requis manquants
 */
publicRouter.post('/whatsapp', WhatsappController.handleWebhook);

/**
 * @openapi
 * /whatsapp/send:
 *   post:
 *     summary: Envoyer un message WhatsApp depuis le CRM à un client
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, body]
 *             properties:
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du client cible
 *               body:
 *                 type: string
 *                 description: Corps textuel du message WhatsApp à envoyer
 *               mandatId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du mandat concerné pour historisation (optionnel, résolu par défaut au dernier mandat actif)
 *     responses:
 *       200:
 *         description: Message envoyé avec succès via Twilio et historisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 messageSid: { type: string }
 *                 status: { type: string }
 *       400:
 *         description: Client sans téléphone, ou pas de mandat actif trouvé, ou champs requis manquants
 *       404:
 *         description: Client ou mandat introuvable
 */
protectedRouter.post('/send', authorize('ADMIN', 'ENQUETEUR'), WhatsappController.sendWhatsApp);

export { publicRouter as whatsappPublicRoutes, protectedRouter as whatsappProtectedRoutes };
