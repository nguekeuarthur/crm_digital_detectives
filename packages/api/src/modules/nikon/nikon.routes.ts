import { Router } from 'express';
import { NikonController } from './nikon.controller';

const router = Router();

/**
 * @openapi
 * /nikon/upload:
 *   post:
 *     summary: Réception d'une photo Nikon Cloud (Webhook public sécurisé)
 *     tags: [Nikon]
 *     description: "Appelé par un service de synchronisation automatique (comme Dropbox/Make) pour importer et classer une photo prise sur le terrain."
 *     parameters:
 *       - in: header
 *         name: x-nikon-key
 *         schema:
 *           type: string
 *         required: true
 *         description: "Clé secrète d'API Nikon pour authentification"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Fichier image ou vidéo de preuve"
 *               tag:
 *                 type: string
 *                 description: "Nom du dossier ou tag de routage (ex: ID de mandat)"
 *     responses:
 *       201:
 *         description: Photo traitée et classée avec succès
 *       401:
 *         description: Clé de sécurité incorrecte ou absente
 *       400:
 *         description: Fichier manquant ou type non autorisé
 */
router.post('/upload', NikonController.uploadMiddleware, NikonController.upload);

export { router as nikonRoutes };
