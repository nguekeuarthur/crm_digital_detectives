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
 *     summary: Lister les devis
 *     tags: [Quotes]
 */
quoteRouter.get('/', QuoteController.getAll);

/**
 * @openapi
 * /quotes/{id}:
 *   get:
 *     summary: Détails d'un devis
 *     tags: [Quotes]
 */
quoteRouter.get('/:id', QuoteController.getById);

/**
 * @openapi
 * /quotes/{id}/pdf:
 *   get:
 *     summary: Télécharger le PDF du devis
 *     tags: [Quotes]
 */
quoteRouter.get('/:id/pdf', QuoteController.downloadPdf);

/**
 * @openapi
 * /quotes:
 *   post:
 *     summary: Créer un devis brouillon
 *     tags: [Quotes]
 */
quoteRouter.post('/', authorize('ADMIN', 'ENQUETEUR'), QuoteController.create);

/**
 * @openapi
 * /quotes/{id}/generate-pdf:
 *   post:
 *     summary: Générer/régénérer le PDF du devis
 *     tags: [Quotes]
 */
quoteRouter.post('/:id/generate-pdf', authorize('ADMIN', 'ENQUETEUR'), QuoteController.generatePdf);

/**
 * @openapi
 * /quotes/{id}/send:
 *   post:
 *     summary: Envoyer le devis par email au client
 *     tags: [Quotes]
 */
quoteRouter.post('/:id/send', authorize('ADMIN', 'ENQUETEUR'), QuoteController.send);

/**
 * @openapi
 * /quotes/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'un devis
 *     tags: [Quotes]
 */
quoteRouter.patch('/:id/status', authorize('ADMIN', 'ENQUETEUR'), QuoteController.updateStatus);

export { quoteRouter };
