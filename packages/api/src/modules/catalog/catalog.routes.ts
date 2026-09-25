import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import multer from 'multer';

const catalogRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Toutes les routes du catalogue sont protégées
catalogRouter.use(authenticate);

/**
 * @openapi
 * /catalog:
 *   get:
 *     summary: Lister les prestations du catalogue
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [DIGITAL_INVESTIGATION, SURVEILLANCE, REPORT, LOGISTICS, ADMIN, OTHER] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Liste des prestations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 */
catalogRouter.get('/', CatalogController.getAll);

/**
 * @openapi
 * /catalog:
 *   post:
 *     summary: Créer une prestation dans le catalogue
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unitPrice, unit, category]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Surveillance mobile
 *               description:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *                 example: 120.00
 *                 description: Prix unitaire HT (client)
 *               internalCost:
 *                 type: number
 *                 example: 75.00
 *                 description: Coût interne (sous-traitant)
 *               unit:
 *                 type: string
 *                 enum: [HOUR, DAY, FIXED, KM]
 *               category:
 *                 type: string
 *                 enum: [DIGITAL_INVESTIGATION, SURVEILLANCE, REPORT, LOGISTICS, ADMIN, OTHER]
 *     responses:
 *       201:
 *         description: Prestation créée
 *       422:
 *         description: Erreur de validation
 */
catalogRouter.post('/', authorize('ADMIN', 'ENQUETEUR'), CatalogController.create);

/**
 * @openapi
 * /catalog/import:
 *   post:
 *     summary: Importer des prestations depuis un fichier Excel
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
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
 *                 description: "Fichier .xlsx avec colonnes : Nom, PrixUnitaire, CoutInterne, Unite, Categorie, Description"
 *     responses:
 *       200:
 *         description: Résultat de l'import
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: integer
 *                   description: Nombre de prestations importées
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Messages d'erreur par ligne
 */
catalogRouter.post('/import', authorize('ADMIN'), upload.single('file'), CatalogController.import);

/**
 * @openapi
 * /catalog/{id}:
 *   get:
 *     summary: Détails d'une prestation
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Détail de la prestation
 *       404:
 *         description: Prestation non trouvée
 */
catalogRouter.get('/:id', CatalogController.getById);

/**
 * @openapi
 * /catalog/{id}:
 *   patch:
 *     summary: Mettre à jour une prestation
 *     tags: [Catalog]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               unitPrice:
 *                 type: number
 *               internalCost:
 *                 type: number
 *               unit:
 *                 type: string
 *                 enum: [HOUR, DAY, FIXED, KM]
 *               category:
 *                 type: string
 *                 enum: [DIGITAL_INVESTIGATION, SURVEILLANCE, REPORT, LOGISTICS, ADMIN, OTHER]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Prestation mise à jour
 *       404:
 *         description: Prestation non trouvée
 */
catalogRouter.patch('/:id', authorize('ADMIN', 'ENQUETEUR'), CatalogController.update);

/**
 * @openapi
 * /catalog/{id}:
 *   delete:
 *     summary: Désactiver une prestation (Admin uniquement)
 *     tags: [Catalog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Prestation désactivée (isActive = false)
 *       404:
 *         description: Prestation non trouvée
 */
catalogRouter.delete('/:id', authorize('ADMIN'), CatalogController.delete);

export { catalogRouter };
