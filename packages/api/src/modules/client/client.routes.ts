import { Router } from 'express';
import { ClientController } from './client.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: Lister les clients
 *     tags: [Clients]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche full-text sur prénom, nom, email, société
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PROSPECT, ACTIF, INACTIF] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée des clients
 */
router.get('/', authorize('ADMIN', 'ENQUETEUR'), ClientController.list);

/**
 * @openapi
 * /clients:
 *   post:
 *     summary: Créer un client
 *     tags: [Clients]
 */
router.post('/', authorize('ADMIN', 'ENQUETEUR'), ClientController.create);

/**
 * @openapi
 * /clients/check-duplicate:
 *   post:
 *     summary: Détecter les doublons potentiels avant création
 *     tags: [Clients]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               phone: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               company: { type: string }
 *     responses:
 *       200:
 *         description: Liste des doublons potentiels avec score de similarité
 */
router.post('/check-duplicate', authorize('ADMIN', 'ENQUETEUR'), ClientController.checkDuplicate);

/**
 * @openapi
 * /clients/export:
 *   get:
 *     summary: Exporter les clients en CSV (ADMIN seulement)
 *     tags: [Clients]
 */
router.get('/export', authorize('ADMIN'), ClientController.exportCsv);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     summary: Détail d'un client
 *     tags: [Clients]
 */
router.get('/:id', authorize('ADMIN', 'ENQUETEUR'), ClientController.getById);

/**
 * @openapi
 * /clients/{id}:
 *   patch:
 *     summary: Mettre à jour un client
 *     tags: [Clients]
 */
router.patch('/:id', authorize('ADMIN', 'ENQUETEUR'), ClientController.update);

/**
 * @openapi
 * /clients/{id}:
 *   delete:
 *     summary: Supprimer un client (Soft Delete)
 *     tags: [Clients]
 */
router.delete('/:id', authorize('ADMIN'), ClientController.delete);

/**
 * @openapi
 * /clients/{id}/mandates:
 *   get:
 *     summary: Liste des mandats d'un client
 *     tags: [Clients]
 */
router.get('/:id/mandates', authorize('ADMIN', 'ENQUETEUR'), ClientController.getMandates);

export { router as clientRoutes };
