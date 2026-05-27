import { Router } from 'express';
import { StatisticsController } from './statistics.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /statistics/dashboard:
 *   get:
 *     summary: Obtenir les statistiques du tableau de bord
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Statistiques du dashboard
 */
router.get('/dashboard', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getDashboardStats);

/**
 * @openapi
 * /statistics/urgent-actions:
 *   get:
 *     summary: Obtenir les actions urgentes
 *     tags: [Statistics]
 */
router.get('/urgent-actions', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getUrgentActions);

/**
 * @openapi
 * /statistics/completed-tasks:
 *   get:
 *     summary: Tâches complétées ce mois
 *     tags: [Statistics]
 */
router.get('/completed-tasks', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getCompletedTasks);

/**
 * @openapi
 * /statistics/mandates-by-status:
 *   get:
 *     summary: Mandats par statut
 *     tags: [Statistics]
 */
router.get('/mandates-by-status', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getMandatesByStatus);

/**
 * @openapi
 * /statistics/clients-with-mandates:
 *   get:
 *     summary: Clients avec mandats
 *     tags: [Statistics]
 */
router.get('/clients-with-mandates', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getClientsWithMandates);

/**
 * @openapi
 * /statistics/revenue-by-client:
 *   get:
 *     summary: Revenus par client
 *     tags: [Statistics]
 */
router.get('/revenue-by-client', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getRevenueByClient);

/**
 * @openapi
 * /statistics/active-subcontractors:
 *   get:
 *     summary: Sous-traitants actifs
 *     tags: [Statistics]
 */
router.get('/active-subcontractors', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getActiveSubcontractors);

/**
 * @openapi
 * /statistics/hours-worked:
 *   get:
 *     summary: Heures travaillées ce mois
 *     tags: [Statistics]
 */
router.get('/hours-worked', authorize('ADMIN', 'ENQUETEUR'), StatisticsController.getHoursWorked);

export default router;
