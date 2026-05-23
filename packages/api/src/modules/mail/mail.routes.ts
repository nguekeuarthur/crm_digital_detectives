import { Router } from 'express';
import { MailController } from './mail.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /mail/sync:
 *   post:
 *     summary: Déclencher manuellement la synchronisation IMAP
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
 */
router.post('/sync', authorize('ADMIN', 'ENQUETEUR'), MailController.triggerSync);

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
 *       - in: query
 *         name: mandatId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
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

export { router as mailRoutes };
