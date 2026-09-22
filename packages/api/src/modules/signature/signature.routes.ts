import { Router } from 'express';
import { SignatureController } from './signature.controller';

/**
 * Retours du prestataire de signature.
 *
 * Monté sous /api/v1/webhooks, donc AVANT le middleware d'authentification et
 * hors de la protection CSRF : l'appel vient de l'extérieur. C'est le jeton de
 * l'URL, propre à un contrat et à usage unique, qui l'authentifie.
 *
 * Skribble appelle ces URL sans garantie de méthode : on accepte les deux.
 */
export const signaturePublicRoutes = Router();

signaturePublicRoutes.post('/signature/:token', SignatureController.retourPrestataire);
signaturePublicRoutes.get('/signature/:token', SignatureController.retourPrestataire);
