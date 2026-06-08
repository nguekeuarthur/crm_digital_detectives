import { Router, Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares';
import { RetentionService } from './retention.service';
import { z } from 'zod';

const router = Router();

const RetentionPolicySchema = z.object({
  entityType: z.enum(['MANDATE', 'CLIENT']),
  triggerEvent: z.enum(['MANDATE_CLOSED', 'CLIENT_INACTIVE']),
  retentionDays: z.number().int().nonnegative(),
  action: z.enum(['DELETE', 'ANONYMIZE']),
});

/**
 * @openapi
 * /admin/retention-policies:
 *   get:
 *     summary: Récupérer toutes les politiques de rétention
 *     tags: [Data Retention]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des politiques de rétention
 */
router.get('/retention-policies', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const policies = await RetentionService.getPolicies();
  res.json(policies);
});

/**
 * @openapi
 * /admin/retention-policies:
 *   post:
 *     summary: Créer ou mettre à jour une politique de rétention
 *     tags: [Data Retention]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityType, triggerEvent, retentionDays, action]
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [MANDATE, CLIENT]
 *               triggerEvent:
 *                 type: string
 *                 enum: [MANDATE_CLOSED, CLIENT_INACTIVE]
 *               retentionDays:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [DELETE, ANONYMIZE]
 *     responses:
 *       200:
 *         description: Politique de rétention enregistrée avec succès
 */
router.post('/retention-policies', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = RetentionPolicySchema.parse(req.body);
  const policy = await RetentionService.createOrUpdatePolicy(parsed);
  res.json(policy);
});

/**
 * @openapi
 * /admin/retention-report:
 *   get:
 *     summary: Rapport des données planifiées pour suppression ou anonymisation
 *     tags: [Data Retention]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rapport de rétention détaillé
 */
router.get('/retention-report', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const report = await RetentionService.getRetentionReport();
  res.json(report);
});

/**
 * @openapi
 * /admin/retention-run:
 *   post:
 *     summary: Déclencher manuellement la purge et les notifications de rétention
 *     tags: [Data Retention]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purge exécutée avec succès
 */
router.post('/retention-run', authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const warningsSent = await RetentionService.sendWarnings();
  const purgeResult = await RetentionService.runPurge();
  res.json({
    message: 'Traitement de rétention exécuté avec succès',
    warningsSent,
    purgeResult,
  });
});

export { router as retentionRoutes };
