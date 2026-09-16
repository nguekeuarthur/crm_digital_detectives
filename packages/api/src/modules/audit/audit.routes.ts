import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /audit:
 *   get:
 *     summary: Récupérer les logs d'audit (ADMIN seulement)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: entity
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des logs
 *       403:
 *         description: Accès refusé
 */
router.get('/', authorize('ADMIN'), AuditController.getLogs);

export { router as auditRoutes };
