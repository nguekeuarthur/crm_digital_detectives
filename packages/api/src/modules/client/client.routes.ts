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
 *         name: status
 *         schema: { type: string, enum: [PROSPECT, ACTIF, INACTIF] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
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
