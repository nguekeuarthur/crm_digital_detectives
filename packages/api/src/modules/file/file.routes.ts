import { Router } from 'express';
import { FileController } from './file.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /folders/{folderId}/files:
 *   post:
 *     summary: Uploader un fichier dans un dossier (extraction EXIF automatique pour les images)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *                 description: Fichier à téléverser (image, PDF, vidéo, etc.)
 *     responses:
 *       201:
 *         description: Fichier uploadé avec extraction EXIF si applicable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 key:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 mimeType:
 *                   type: string
 *                 exifData:
 *                   type: object
 *                   nullable: true
 *                 geoLat:
 *                   type: number
 *                   nullable: true
 *                 geoLng:
 *                   type: number
 *                   nullable: true
 *       404:
 *         description: Dossier non trouvé
 */
router.post('/folders/:folderId/files', authorize('ADMIN', 'ENQUETEUR'), FileController.uploadMiddleware, FileController.upload);
router.get('/folders/:folderId/files', authorize('ADMIN', 'ENQUETEUR'), FileController.listInFolder);

/**
 * @openapi
 * /files/{id}/download:
 *   get:
 *     summary: Récupérer une URL de téléchargement (pré-signée S3 ou lien local)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: URL de téléchargement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 isLocal:
 *                   type: boolean
 *       404:
 *         description: Fichier non trouvé
 */
router.get('/files/:id/download', FileController.download);

/**
 * @openapi
 * /files/stream/{id}:
 *   get:
 *     summary: Streamer le contenu d'un fichier (mode LOCAL uniquement)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Contenu binaire du fichier (déchiffré)
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Fichier non trouvé
 */
router.get('/files/stream/:id', FileController.stream);

/**
 * @openapi
 * /files/{id}/metadata:
 *   get:
 *     summary: Récupérer les métadonnées EXIF et coordonnées GPS d'un fichier
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Métadonnées du fichier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 mimeType:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 exifData:
 *                   type: object
 *                   nullable: true
 *                   description: Données EXIF brutes (Make, Model, DateTimeOriginal, GPS...)
 *                 geoLat:
 *                   type: number
 *                   nullable: true
 *                   description: Latitude GPS extraite
 *                 geoLng:
 *                   type: number
 *                   nullable: true
 *                   description: Longitude GPS extraite
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Fichier non trouvé
 */
router.get('/files/:id/metadata', FileController.getMetadata);

router.patch('/files/:id', authorize('ADMIN', 'ENQUETEUR'), FileController.rename);

/**
 * @openapi
 * /files/{id}:
 *   delete:
 *     summary: Supprimer un fichier (Soft Delete)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fichier marqué comme supprimé
 *       404:
 *         description: Fichier non trouvé
 */
router.delete('/files/:id', authorize('ADMIN', 'ENQUETEUR'), FileController.delete);

export { router as fileRoutes };
