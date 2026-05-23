import { Router } from 'express';
import { ClientController } from './client.controller';
import { authorize, AuthRequest } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: Lister les clients (avec filtres, recherche et pagination)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PROSPECT, ACTIF, INACTIF] }
 *         description: Filtrer par statut client
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche dans nom, prénom, email, entreprise
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Date de création min (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Date de création max (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée des clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Non authentifié
 */
router.get('/', authorize('ADMIN', 'ENQUETEUR'), ClientController.list);

/**
 * @openapi
 * /clients:
 *   post:
 *     summary: Créer un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               company:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PROSPECT, ACTIF, INACTIF]
 *                 default: PROSPECT
 *     responses:
 *       201:
 *         description: Client créé
 *       409:
 *         description: Email ou téléphone déjà utilisé
 *       422:
 *         description: Erreur de validation
 */
router.post('/', authorize('ADMIN', 'ENQUETEUR'), ClientController.create);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     summary: Détail d'un client (avec ses mandats)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fiche client avec mandats inclus
 *       404:
 *         description: Client non trouvé
 */
router.get('/:id', authorize('ADMIN', 'ENQUETEUR'), ClientController.getById);

/**
 * @openapi
 * /clients/{id}:
 *   patch:
 *     summary: Mettre à jour un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               company:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PROSPECT, ACTIF, INACTIF]
 *     responses:
 *       200:
 *         description: Client mis à jour
 *       404:
 *         description: Client non trouvé
 */
router.patch('/:id', authorize('ADMIN', 'ENQUETEUR'), ClientController.update);

/**
 * @openapi
 * /clients/{id}:
 *   delete:
 *     summary: Supprimer un client (Soft Delete)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Client archivé (soft delete)
 *       404:
 *         description: Client non trouvé
 */
router.delete('/:id', authorize('ADMIN'), ClientController.delete);

/**
 * @openapi
 * /clients/{id}/mandates:
 *   get:
 *     summary: Liste des mandats d'un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des mandats du client
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mandat'
 */
router.get('/:id/mandates', authorize('ADMIN', 'ENQUETEUR'), ClientController.getMandates);

/**
 * @openapi
 * /clients/{id}/export:
 *   post:
 *     summary: Exporter toutes les données d'un client (format ZIP asynchrone)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Demande d'exportation acceptée, un e-mail sera envoyé
 */
router.post('/:id/export', authorize('ADMIN', 'ENQUETEUR'), (req, res, next) => {
  import('../export/export.controller').then(m => m.ExportController.exportClient(req, res)).catch(next);
});

/**
 * @openapi
 * /clients/{id}/emails:
 *   get:
 *     summary: Liste des emails associés à un client (triée chronologiquement)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID du client
 *       - in: query
 *         name: grouped
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Si "true", regroupe les emails par fil de conversation (threadId)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Liste chronologique des emails du client (entrants et sortants)
 *       404:
 *         description: Client non trouvé
 */
router.get('/:id/emails', authorize('ADMIN', 'ENQUETEUR'), (req, res, next) => {
  import('../mail/mail.controller').then(m => m.MailController.getClientEmails(req as AuthRequest, res)).catch(next);
});

export { router as clientRoutes };
