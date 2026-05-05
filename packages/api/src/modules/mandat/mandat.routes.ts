import { Router } from 'express';
import { MandatController } from './mandat.controller';
import { authorize, authorizeMandat } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /mandates:
 *   get:
 *     summary: Lister les mandats
 *     tags: [Mandates]
 *     responses:
 *       200:
 *         description: Liste des mandats
 */
router.get('/', MandatController.list);

/**
 * @openapi
 * /mandates:
 *   post:
 *     summary: Créer un mandat
 *     tags: [Mandates]
 */
router.post('/', authorize('ADMIN', 'ENQUETEUR'), MandatController.create);

/**
 * @openapi
 * /mandates/{id}:
 *   get:
 *     summary: Détail d'un mandat
 *     tags: [Mandates]
 */
router.get('/:id', authorizeMandat, MandatController.getById);

/**
 * @openapi
 * /mandates/{id}:
 *   patch:
 *     summary: Mettre à jour un mandat
 *     tags: [Mandates]
 */
router.patch('/:id', authorizeMandat, MandatController.update);

/**
 * @openapi
 * /mandates/{id}:
 *   delete:
 *     summary: Supprimer un mandat (Soft Delete)
 *     tags: [Mandates]
 */
router.delete('/:id', authorize('ADMIN'), MandatController.delete);

/**
 * @openapi
 * /mandates/{id}/assign:
 *   post:
 *     summary: Affecter un enquêteur
 *     tags: [Mandates]
 */
router.post('/:id/assign', authorize('ADMIN'), MandatController.assign);

/**
 * @openapi
 * /mandates/{id}/assign/{userId}:
 *   delete:
 *     summary: Retirer un enquêteur
 *     tags: [Mandates]
 */
router.delete('/:id/assign/:userId', authorize('ADMIN'), MandatController.unassign);

/**
 * @openapi
 * /mandates/{id}/activity:
 *   get:
 *     summary: Fil d'activité d'un mandat
 *     tags: [Mandates]
 */
router.get('/:id/activity', authorizeMandat, MandatController.getActivity);

/**
 * @openapi
 * /mandates/{id}/geo-files:
 *   get:
 *     summary: Récupérer tous les fichiers géolocalisés d'un mandat
 *     tags: [Mandates]
 */
router.get('/:id/geo-files', authorizeMandat, MandatController.getGeoFiles);

/**
 * @openapi
 * /mandates/{id}/folders:
 *   post:
 *     summary: Créer un dossier personnalisé
 *     tags: [Mandates]
 */
router.post('/:id/folders', authorizeMandat, MandatController.createFolder);

/**
 * @openapi
 * /mandates/{id}/folders/{folderId}:
 *   patch:
 *     summary: Renommer un dossier personnalisé
 *     tags: [Mandates]
 *   delete:
 *     summary: Supprimer un dossier personnalisé (si vide)
 *     tags: [Mandates]
 */
router.patch('/:id/folders/:folderId', authorizeMandat, MandatController.renameFolder);
router.delete('/:id/folders/:folderId', authorizeMandat, MandatController.deleteFolder);

export { router as mandatRoutes };
