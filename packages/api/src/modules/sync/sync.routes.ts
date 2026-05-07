import { Router, Request, Response, NextFunction } from 'express';
import { SyncController } from './sync.controller';
import { authorize } from '../../shared/middlewares/authorize';

const syncRouter = Router();
const webhookRouter = Router();

/**
 * ROUTES PROTÉGÉES (Synchronisation manuelle)
 * Préfixe : /api/v1/sync
 * Note : authenticate est appliqué globalement dans app.ts pour toutes les routes /api/v1/*
 */

/**
 * @openapi
 * /sync/wordpress/clients:
 *   get:
 *     summary: Importer manuellement les clients depuis WordPress
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Résumé de la synchronisation (créés, mis à jour, total)
 */
syncRouter.get('/wordpress/clients', authorize('ADMIN'), SyncController.syncClients);


/**
 * ROUTES PUBLIQUES (Webhooks WordPress → CRM)
 * Préfixe : /api/v1/webhooks
 * Sécurisées par un secret partagé (header X-WP-Webhook-Secret)
 */

// Middleware de vérification du secret webhook
function verifyWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.WP_WEBHOOK_SECRET;
  
  // Si pas de secret configuré, on accepte tout (développement)
  if (!secret) {
    console.warn('⚠️ WP_WEBHOOK_SECRET non configuré — webhooks non protégés');
    return next();
  }

  const receivedSecret = req.headers['x-wp-webhook-secret'] || req.query.secret;
  
  if (receivedSecret !== secret) {
    return res.status(403).json({ error: 'Secret webhook invalide' });
  }

  next();
}

webhookRouter.use(verifyWebhookSecret);

/**
 * @openapi
 * /webhooks/wordpress/client:
 *   post:
 *     summary: Réception d'un nouveau compte client WP
 *     tags: [Webhooks]
 *     description: Appelé automatiquement par WP Webhooks quand un utilisateur est créé sur WordPress
 */
webhookRouter.post('/wordpress/client', SyncController.webhookClient);

/**
 * @openapi
 * /webhooks/wordpress/mandate:
 *   post:
 *     summary: Réception d'une nouvelle demande de mandat WP (formulaire CF7/WooCommerce)
 *     tags: [Webhooks]
 */
webhookRouter.post('/wordpress/mandate', SyncController.webhookMandate);

export { syncRouter, webhookRouter };
