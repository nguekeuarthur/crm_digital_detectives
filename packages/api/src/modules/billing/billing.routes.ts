import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN')); // Uniquement l'admin gère la facturation

/**
 * @openapi
 * /billing/subcontractors/{subcontractorId}/summary:
 *   get:
 *     summary: Récupérer le résumé de facturation
 *     tags: [Billing]
 */
router.get('/subcontractors/:subcontractorId/summary', BillingController.getSummary);

/**
 * @openapi
 * /billing/subcontractors/{subcontractorId}/pdf:
 *   get:
 *     summary: Télécharger le PDF de facturation
 *     tags: [Billing]
 */
router.get('/subcontractors/:subcontractorId/pdf', BillingController.downloadPDF);

/**
 * @openapi
 * /billing/mark-invoiced:
 *   post:
 *     summary: Marquer des heures comme facturées
 *     tags: [Billing]
 */
router.post('/mark-invoiced', BillingController.markAsInvoiced);

export { router as billingRoutes };
