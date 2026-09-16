import { Router } from 'express';
import { RingoverController } from './ringover.controller';

const router = Router();

/**
 * @openapi
 * /webhooks/ringover:
 *   post:
 *     summary: Réception des événements de téléphonie Ringover (Webhook public)
 *     tags: [Ringover]
 *     description: Appelé par Ringover lors du début, de la réponse ou de la fin d'un appel. Diffuse l'événement en WebSocket pour afficher la pop-up de CTI et loggue les appels en BDD.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [call_started, call_ended, call_missed]
 *                 description: Type d'événement d'appel
 *               call:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID unique de l'appel
 *                   direction:
 *                     type: string
 *                     enum: [in, out]
 *                   from:
 *                     type: string
 *                     description: Numéro de l'appelant
 *                   to:
 *                     type: string
 *                     description: Numéro du destinataire
 *                   duration:
 *                     type: integer
 *                     description: Durée en secondes
 *                   status:
 *                     type: string
 *                     description: Statut de l'appel (ringing, answered, missed)
 *     responses:
 *       200:
 *         description: Événement traité avec succès
 *       400:
 *         description: Requête mal formée
 */
router.post('/ringover', RingoverController.handleWebhook);

export { router as ringoverPublicRoutes };
