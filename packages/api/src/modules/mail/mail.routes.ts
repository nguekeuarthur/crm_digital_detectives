import { Router } from 'express';
import { MailController } from './mail.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /mail/sync:
 *   post:
 *     summary: Déclencher manuellement la synchronisation IMAP bidirectionnelle (INBOX + SENT)
 *     tags: [Mail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: windowDays
 *         schema: { type: integer, default: 3 }
 *         description: Nombre de jours passés à analyser
 *     responses:
 *       200:
 *         description: Synchronisation effectuée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 details:
 *                   type: object
 *                   properties:
 *                     totalFetched: { type: integer }
 *                     newEmailsSaved: { type: integer }
 */
router.post('/sync', authorize('ADMIN', 'ENQUETEUR'), MailController.triggerSync);

/**
 * @openapi
 * /mail/send:
 *   post:
 *     summary: Envoyer un email depuis le CRM (avec BCC automatique vers la boîte Digitaldetectives)
 *     tags: [Mail]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject]
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Adresse email du destinataire
 *               subject:
 *                 type: string
 *                 description: Objet de l'email
 *               text:
 *                 type: string
 *                 description: Corps de l'email (texte brut)
 *               html:
 *                 type: string
 *                 description: Corps de l'email (HTML)
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du client à associer (optionnel)
 *               mandatId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du mandat à associer (optionnel)
 *               inReplyTo:
 *                 type: string
 *                 description: Message-ID de l'email auquel on répond (optionnel)
 *     responses:
 *       200:
 *         description: Email envoyé et enregistré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 messageId: { type: string }
 *       400:
 *         description: Champs requis manquants
 */
router.post('/send', authorize('ADMIN', 'ENQUETEUR'), MailController.sendEmail);

/**
 * @openapi
 * /mail:
 *   get:
 *     summary: Lister les e-mails synchronisés (avec pagination et filtres)
 *     tags: [Mail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string, format: uuid }
 *         description: Filtrer par client
 *       - in: query
 *         name: mandatId
 *         schema: { type: string, format: uuid }
 *         description: Filtrer par mandat
 *       - in: query
 *         name: direction
 *         schema: { type: string, enum: [INBOUND, OUTBOUND] }
 *         description: Filtrer par direction (entrant ou sortant)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche dans le sujet, expéditeur ou corps
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée des e-mails
 */
router.get('/', authorize('ADMIN', 'ENQUETEUR'), MailController.listEmails);

/**
 * @openapi
 * /mail/{id}:
 *   get:
 *     summary: Détail d'un email (avec fil de conversation si existant)
 *     tags: [Mail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID de l'email
 *     responses:
 *       200:
 *         description: Détail de l'email avec thread
 *       404:
 *         description: Email non trouvé
 */
router.get('/:id', authorize('ADMIN', 'ENQUETEUR'), MailController.getEmailById);

export { router as mailRoutes };
