import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.use(authenticate);

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
router.get('/subcontractors/:subcontractorId/summary', authorize('ADMIN'), BillingController.getSummary);

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
router.get('/subcontractors/:subcontractorId/pdf', authorize('ADMIN'), BillingController.downloadPDF);

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
router.post('/mark-invoiced', authorize('ADMIN'), BillingController.markAsInvoiced);

/**
 * @openapi
 * /billing/invoices:
 *   get:
 *     summary: Lister les factures clients (avec filtres optionnels)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: mandatId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des factures
 */
router.get('/invoices', authorize('ADMIN', 'ENQUETEUR'), BillingController.listInvoices);

/**
 * @openapi
 * /billing/invoices/{id}/pay:
 *   post:
 *     summary: Générer un lien de paiement Stripe pour une facture
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: URL de paiement Stripe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 */
router.post('/invoices/:id/pay', authorize('ADMIN', 'ENQUETEUR'), BillingController.createPaymentLink);

/**
 * @openapi
 * /billing/invoices/{id}/send-to-client:
 *   post:
 *     summary: Générer un lien de paiement Stripe et l'envoyer par email au client
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lien de paiement envoyé par email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                 emailSent:
 *                   type: boolean
 */
router.post('/invoices/:id/send-to-client', authorize('ADMIN', 'ENQUETEUR'), BillingController.sendPaymentLinkToClient);

/**
 * @openapi
 * /billing/invoices/{id}/pdf:
 *   get:
 *     summary: Télécharger/Visualiser le PDF de la facture acquittée du client
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fichier PDF de la facture acquittée
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/invoices/:id/pdf', authorize('ADMIN', 'ENQUETEUR'), BillingController.downloadInvoicePDF);

export { router as billingRoutes };
