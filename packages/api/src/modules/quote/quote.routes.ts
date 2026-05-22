import { Router } from 'express';
import { QuoteController } from './quote.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const quoteRouter = Router();

// Toutes les routes sont protégées
quoteRouter.use(authenticate);

/**
 * @openapi
 * /quotes:
 *   get:
 *     summary: Lister les devis (avec filtres optionnels)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mandatId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: clientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED] }
 *     responses:
 *       200:
 *         description: Liste des devis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quote'
 */
quoteRouter.get('/', QuoteController.getAll);

/**
 * @openapi
 * /quotes/{id}:
 *   get:
 *     summary: Détails d'un devis (avec items et prestations liées)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Devis complet avec items, client et mandat
 *       404:
 *         description: Devis non trouvé
 */
quoteRouter.get('/:id', QuoteController.getById);

/**
 * @openapi
 * /quotes/{id}/pdf:
 *   get:
 *     summary: Télécharger le PDF du devis
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fichier PDF du devis
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: PDF non encore généré ou devis non trouvé
 */
quoteRouter.get('/:id/pdf', QuoteController.downloadPdf);

/**
 * @openapi
 * /quotes:
 *   post:
 *     summary: Créer un devis brouillon (avec items et calcul automatique des totaux/marges)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mandatId, clientId, items]
 *             properties:
 *               mandatId:
 *                 type: string
 *                 format: uuid
 *               clientId:
 *                 type: string
 *                 format: uuid
 *               taxRate:
 *                 type: number
 *                 default: 7.7
 *                 description: Taux de TVA en % (défaut 7.7% TVA suisse)
 *               expiresAt:
 *                 type: string
 *                 format: date
 *                 description: Date d'expiration du devis
 *               notes:
 *                 type: string
 *                 description: Notes / CGV en bas du devis
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [label, quantity, unitPrice]
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                       format: uuid
 *                       description: Référence prestation catalogue (optionnel)
 *                     label:
 *                       type: string
 *                       example: Surveillance mobile 3 jours
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       example: 3
 *                     unitPrice:
 *                       type: number
 *                       example: 120.00
 *                     discount:
 *                       type: number
 *                       default: 0
 *                       description: Remise en % sur cette ligne
 *     responses:
 *       201:
 *         description: Devis créé avec référence auto-générée (DD-YYYY-NNNN)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 reference:
 *                   type: string
 *                   example: DD-2026-0001
 *                 totalHT:
 *                   type: number
 *                 totalTTC:
 *                   type: number
 *                 marginRate:
 *                   type: number
 *                   nullable: true
 *                   description: Marge calculée en %
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *       422:
 *         description: Erreur de validation
 */
quoteRouter.post('/', authorize('ADMIN', 'ENQUETEUR'), QuoteController.create);

/**
 * @openapi
 * /quotes/{id}/generate-pdf:
 *   post:
 *     summary: Générer/régénérer le PDF du devis (PDFKit)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF généré et chemin sauvegardé en base
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pdfPath:
 *                   type: string
 *       404:
 *         description: Devis non trouvé
 */
quoteRouter.post('/:id/generate-pdf', authorize('ADMIN', 'ENQUETEUR'), QuoteController.generatePdf);

/**
 * @openapi
 * /quotes/{id}/send:
 *   post:
 *     summary: Envoyer le devis par email au client (PDF en pièce jointe)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Email envoyé avec le PDF en pièce jointe
 *       400:
 *         description: PDF non encore généré
 *       404:
 *         description: Devis non trouvé
 */
quoteRouter.post('/:id/send', authorize('ADMIN', 'ENQUETEUR'), QuoteController.send);

/**
 * @openapi
 * /quotes/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'un devis
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Transition impossible (devis déjà accepté/refusé)
 *       404:
 *         description: Devis non trouvé
 */
quoteRouter.patch('/:id/status', authorize('ADMIN', 'ENQUETEUR'), QuoteController.updateStatus);

export { quoteRouter };
