import { Router } from 'express';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /admin/export-global:
 *   post:
 *     summary: Exporter toutes les données du système (format ZIP asynchrone, Admin seul)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demande d'exportation globale acceptée, un e-mail sera envoyé
 */
router.post('/export-global', authorize('ADMIN'), (req, res, next) => {
  import('../export/export.controller').then(m => m.ExportController.exportGlobal(req, res)).catch(next);
});

export { router as adminRoutes };
