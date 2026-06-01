import { Router } from 'express';
import { MandatController } from './mandat.controller';
import { authorize, authorizeMandat, AuthRequest } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /mandates:
 *   get:
 *     summary: Lister les mandats (avec filtres et pagination)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OUVERT, EN_COURS, EN_ATTENTE_PREUVES, A_VALIDER, TERMINE, ANNULE] }
 *       - in: query
 *         name: clientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: enqueteurId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste paginée des mandats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mandates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Mandat'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get('/', MandatController.list);

/**
 * @openapi
 * /mandates:
 *   post:
 *     summary: Créer un mandat (génère automatiquement 7 dossiers standards)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, clientId]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Surveillance sujet X
 *               description:
 *                 type: string
 *               clientId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Mandat créé avec ses 7 dossiers standards
 *       422:
 *         description: Erreur de validation
 */
router.post('/', authorize('ADMIN', 'ENQUETEUR'), MandatController.create);

/**
 * @openapi
 * /mandates/{id}:
 *   get:
 *     summary: Détail d'un mandat (avec client, enquêteur et dossiers)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fiche mandat complète
 *       404:
 *         description: Mandat non trouvé
 */
router.get('/:id', authorizeMandat, MandatController.getById);

/**
 * @openapi
 * /mandates/{id}:
 *   patch:
 *     summary: Mettre à jour un mandat (titre, description, statut)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [OUVERT, EN_COURS, EN_ATTENTE_PREUVES, A_VALIDER, TERMINE, ANNULE]
 *     responses:
 *       200:
 *         description: Mandat mis à jour
 *       400:
 *         description: Transition de statut impossible
 *       404:
 *         description: Mandat non trouvé
 */
router.patch('/:id', authorizeMandat, MandatController.update);

/**
 * @openapi
 * /mandates/{id}:
 *   delete:
 *     summary: Supprimer un mandat (Soft Delete — Admin uniquement)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Mandat archivé
 */
router.delete('/:id', authorize('ADMIN'), MandatController.delete);

/**
 * @openapi
 * /mandates/{id}/assign:
 *   post:
 *     summary: Affecter un enquêteur à un mandat (Admin)
 *     tags: [Mandates]
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
 *             required: [enqueteurId]
 *             properties:
 *               enqueteurId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Enquêteur affecté
 */
router.post('/:id/assign', authorize('ADMIN'), MandatController.assign);

/**
 * @openapi
 * /mandates/{id}/assign/{userId}:
 *   delete:
 *     summary: Retirer un enquêteur d'un mandat (Admin)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enquêteur retiré
 */
router.delete('/:id/assign/:userId', authorize('ADMIN'), MandatController.unassign);

/**
 * @openapi
 * /mandates/{id}/activity:
 *   get:
 *     summary: Fil d'activité chronologique d'un mandat
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des activités du mandat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [FILE_ADDED, STATUS_CHANGED, EMAIL, CALL, WHATSAPP, NOTE, ASSIGNMENT, MANDAT_CREATED]
 *                   payload:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/:id/activity', authorizeMandat, MandatController.getActivity);

/**
 * @openapi
 * /mandates/{id}/geo-files:
 *   get:
 *     summary: Récupérer tous les fichiers géolocalisés d'un mandat
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des fichiers avec coordonnées GPS
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   geoLat:
 *                     type: number
 *                   geoLng:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/:id/geo-files', authorize('ADMIN', 'ENQUETEUR'), MandatController.getGeoFiles);

/**
 * @openapi
 * /mandates/{id}/folders:
 *   post:
 *     summary: Créer un dossier personnalisé dans un mandat
 *     tags: [Mandates]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Notes de terrain
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du dossier parent (pour sous-dossiers)
 *     responses:
 *       201:
 *         description: Dossier créé
 */
router.post('/:id/folders', authorizeMandat, MandatController.createFolder);

/**
 * @openapi
 * /mandates/{id}/folders/{folderId}:
 *   patch:
 *     summary: Renommer un dossier personnalisé
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dossier renommé
 *       400:
 *         description: Dossier système non modifiable
 */
router.patch('/:id/folders/:folderId', authorizeMandat, MandatController.renameFolder);

/**
 * @openapi
 * /mandates/{id}/folders/{folderId}:
 *   delete:
 *     summary: Supprimer un dossier personnalisé (si vide)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dossier supprimé
 *       400:
 *         description: Dossier système ou non vide
 */
router.delete('/:id/folders/:folderId', authorizeMandat, MandatController.deleteFolder);

/**
 * @openapi
 * /mandates/{id}/subcontractors:
 *   post:
 *     summary: Affecter un sous-traitant à ce mandat (Admin)
 *     tags: [Mandates]
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
 *             required: [subcontractorId, hourlyRate]
 *             properties:
 *               subcontractorId:
 *                 type: string
 *                 format: uuid
 *               hourlyRate:
 *                 type: number
 *                 example: 85.00
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Sous-traitant affecté au mandat
 */
router.post('/:id/subcontractors', authorize('ADMIN'), MandatController.assignSubcontractor);

/**
 * @openapi
 * /mandates/{id}/time-entries:
 *   get:
 *     summary: Récupérer le résumé des heures saisies pour ce mandat
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Liste des saisies d'heures du mandat
 */
router.get('/:id/time-entries', authorizeMandat, MandatController.getTimeEntries);

/**
 * @openapi
 * /mandates/{id}/export:
 *   post:
 *     summary: Exporter toutes les données d'un mandat (format ZIP asynchrone)
 *     tags: [Mandates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Demande d'exportation acceptée, un e-mail sera envoyé
 */
router.post('/:id/export', authorizeMandat, (req: AuthRequest, res, next) => {
  if (req.user?.role === 'SOUS_TRAITANT') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Permissions insuffisantes pour exporter un mandat' }
    });
  }
  import('../export/export.controller').then(m => m.ExportController.exportMandate(req, res)).catch(next);
});

export { router as mandatRoutes };
