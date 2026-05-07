import { Router } from 'express';
import { FileController } from './file.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /folders/{folderId}/files:
 *   post:
 *     summary: Uploader un fichier dans un dossier
 *     tags: [Files]
 */
router.post('/folders/:folderId/files', authorize('ADMIN', 'ENQUETEUR'), FileController.uploadMiddleware, FileController.upload);

/**
 * @openapi
 * /files/{id}/download:
 *   get:
 *     summary: Récupérer une URL de téléchargement
 *     tags: [Files]
 */
router.get('/files/:id/download', FileController.download);

/**
 * @openapi
 * /files/stream/{id}:
 *   get:
 *     summary: Streamer le contenu d'un fichier (LOCAL)
 *     tags: [Files]
 */
router.get('/files/stream/:id', FileController.stream);

/**
 * @openapi
 * /files/{id}/metadata:
 *   get:
 *     summary: Récupérer les métadonnées EXIF et GPS
 *     tags: [Files]
 */
router.get('/files/:id/metadata', FileController.getMetadata);

/**
 * @openapi
 * /files/{id}:
 *   delete:
 *     summary: Supprimer un fichier (Soft Delete)
 *     tags: [Files]
 */
router.delete('/files/:id', authorize('ADMIN', 'ENQUETEUR'), FileController.delete);

export { router as fileRoutes };
