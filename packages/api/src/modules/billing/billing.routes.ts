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
 *     summary: Récupérer le résumé de facturation d'un sous-traitant
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subcontractorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Résumé de facturation (heures validées, total dû, déjà facturé)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subcontractor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                 totalHours:
 *                   type: number
 *                   description: Total d'heures validées
 *                 totalAmount:
 *                   type: number
 *                   description: Montant total dû (heures × taux horaire)
 *                 invoicedAmount:
 *                   type: number
 *                   description: Montant déjà facturé
 *                 pendingAmount:
 *                   type: number
 *                   description: Montant restant à facturer
 *       404:
 *         description: Sous-traitant non trouvé
 */
router.get('/subcontractors/:subcontractorId/summary', BillingController.getSummary);

/**
 * @openapi
 * /billing/subcontractors/{subcontractorId}/pdf:
 *   get:
 *     summary: Télécharger le PDF de facturation d'un sous-traitant
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subcontractorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fichier PDF de facturation
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Sous-traitant non trouvé
 */
router.get('/subcontractors/:subcontractorId/pdf', BillingController.downloadPDF);

/**
 * @openapi
 * /billing/mark-invoiced:
 *   post:
 *     summary: Marquer des saisies d'heures comme facturées
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timeEntryIds]
 *             properties:
 *               timeEntryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Liste des IDs de saisies d'heures à marquer comme facturées
 *     responses:
 *       200:
 *         description: Saisies marquées comme facturées (invoiced = true)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: integer
 *                   description: Nombre de saisies mises à jour
 */
router.post('/mark-invoiced', BillingController.markAsInvoiced);

export { router as billingRoutes };
