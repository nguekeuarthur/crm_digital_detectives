import { Router } from 'express';
import { SyncController } from './sync.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const syncRouter = Router();
const webhookRouter = Router();

/**
 * ROUTES PROTÉGÉES (Synchronisation manuelle)
 * Préfixe : /api/v1/sync
 */
syncRouter.use(authenticate);
syncRouter.use(authorize('ADMIN'));

/**
 * @openapi
 * /sync/wordpress/clients:
 *   get:
 *     summary: Importer manuellement les clients depuis WordPress
 *     tags: [Sync]
 */
syncRouter.get('/wordpress/clients', SyncController.syncClients);


/**
 * ROUTES PUBLIQUES (Webhooks WordPress)
 * Préfixe : /api/v1/webhooks
 * Note : Dans la vraie vie, on protégerait ces routes par un token secret ou une vérification IP
 */

/**
 * @openapi
 * /webhooks/wordpress/client:
 *   post:
 *     summary: Réception d'un nouveau compte client WP
 *     tags: [Webhooks]
 */
webhookRouter.post('/wordpress/client', SyncController.webhookClient);

/**
 * @openapi
 * /webhooks/wordpress/mandate:
 *   post:
 *     summary: Réception d'une nouvelle demande de mandat WP
 *     tags: [Webhooks]
 */
webhookRouter.post('/wordpress/mandate', SyncController.webhookMandate);

export { syncRouter, webhookRouter };
