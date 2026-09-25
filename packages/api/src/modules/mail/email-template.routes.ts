import { Router } from 'express';
import { EmailTemplateController } from './email-template.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /mail/templates:
 *   get:
 *     summary: Lister tous les templates d'e-mails automatiques
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       code: { type: string, example: MANDAT_CREATED }
 *                       name: { type: string }
 *                       subject: { type: string }
 *                       htmlBody: { type: string }
 *                       variables: { type: object }
 */
router.get('/templates', authorize('ADMIN'), EmailTemplateController.listTemplates);

/**
 * @openapi
 * /mail/templates/{code}:
 *   get:
 *     summary: Récupérer un template par son code
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Code unique du template (ex MANDAT_CREATED)
 *     responses:
 *       200:
 *         description: Détail du template
 *       404:
 *         description: Template non trouvé
 */
router.get('/templates/:code', authorize('ADMIN'), EmailTemplateController.getTemplate);

/**
 * @openapi
 * /mail/templates/{code}:
 *   put:
 *     summary: Modifier un template d'e-mail (subject et/ou htmlBody)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Code unique du template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom lisible du template
 *               subject:
 *                 type: string
 *                 description: Sujet de l'e-mail (supporte les variables Handlebars)
 *               htmlBody:
 *                 type: string
 *                 description: Corps HTML de l'e-mail (supporte les variables Handlebars)
 *     responses:
 *       200:
 *         description: Template mis à jour
 *       404:
 *         description: Template non trouvé
 */
router.put('/templates/:code', authorize('ADMIN'), EmailTemplateController.updateTemplate);

/**
 * @openapi
 * /mail/auto-logs:
 *   get:
 *     summary: Historique des envois automatiques d'e-mails
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, SENT, FAILED] }
 *         description: Filtrer par statut d'envoi
 *       - in: query
 *         name: templateCode
 *         schema: { type: string }
 *         description: Filtrer par code de template
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée des logs d'envoi automatique
 */
router.get('/auto-logs', authorize('ADMIN'), EmailTemplateController.listLogs);

/**
 * @openapi
 * /mail/queue-status:
 *   get:
 *     summary: Statut de la file d'attente d'e-mails (compteurs par statut)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compteurs de la queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queue:
 *                   type: object
 *                   properties:
 *                     pending: { type: integer }
 *                     processing: { type: integer }
 *                     sent: { type: integer }
 *                     failed: { type: integer }
 *                     total: { type: integer }
 */
router.get('/queue-status', authorize('ADMIN'), EmailTemplateController.getQueueStatus);

export { router as emailTemplateRoutes };
