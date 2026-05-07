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
 */
catalogRouter.get('/', CatalogController.getAll);

/**
 * @openapi
 * /catalog/import:
 *   post:
 *     summary: Importer des prestations depuis un fichier Excel
 *     tags: [Catalog]
 */
catalogRouter.post('/import', authorize('ADMIN'), upload.single('file'), CatalogController.import);

/**
 * @openapi
 * /catalog/{id}:
 *   get:
 *     summary: Détails d'une prestation
 *     tags: [Catalog]
 */
catalogRouter.get('/:id', CatalogController.getById);

// Routes restreintes aux admins/enquêteurs pour la modification
catalogRouter.post('/', authorize('ADMIN', 'ENQUETEUR'), CatalogController.create);
catalogRouter.patch('/:id', authorize('ADMIN', 'ENQUETEUR'), CatalogController.update);
catalogRouter.delete('/:id', authorize('ADMIN'), CatalogController.delete);

export { catalogRouter };
