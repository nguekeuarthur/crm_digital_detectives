import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { WordpressService } from './wordpress.service';

export class SyncController {
  /**
   * Déclenche une synchronisation manuelle des clients depuis WordPress
   */
  static async syncClients(req: AuthRequest, res: Response) {
    const result = await WordpressService.syncClients(req.user!.userId);
    res.json(result);
  }

  /**
   * Webhook: Création d'un client poussé par WP
   */
  static async webhookClient(req: Request, res: Response) {
    // Note: Dans un vrai environnement, vérifier un header de signature (ex: X-WP-Webhook-Secret)
    const client = await WordpressService.handleClientWebhook(req.body);
    res.status(201).json(client);
  }

  /**
   * Webhook: Soumission d'un formulaire de mandat
   */
  static async webhookMandate(req: Request, res: Response) {
    const mandat = await WordpressService.handleMandateWebhook(req.body);
    res.status(201).json(mandat);
  }
}
