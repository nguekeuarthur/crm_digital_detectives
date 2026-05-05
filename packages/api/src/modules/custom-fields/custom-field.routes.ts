import { Router } from 'express';
import { CustomFieldController } from './custom-field.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /custom-fields/definitions:
 *   post:
 *     summary: Créer une définition de champ (ADMIN)
 *     tags: [CustomFields]
 */
router.post('/definitions', authorize('ADMIN'), CustomFieldController.createDefinition);

/**
 * @openapi
 * /custom-fields/definitions:
 *   get:
 *     summary: Récupérer les définitions par type d'entité
 *     tags: [CustomFields]
 */
router.get('/definitions', CustomFieldController.getDefinitions);

/**
 * @openapi
 * /custom-fields/definitions/{id}:
 *   delete:
 *     summary: Supprimer une définition (ADMIN)
 *     tags: [CustomFields]
 */
router.delete('/definitions/:id', authorize('ADMIN'), CustomFieldController.deleteDefinition);

/**
 * @openapi
 * /custom-fields/values:
 *   post:
 *     summary: Enregistrer des valeurs pour une entité
 *     tags: [CustomFields]
 */
router.post('/values', CustomFieldController.setValues);

/**
 * @openapi
 * /custom-fields/values/{entityId}:
 *   get:
 *     summary: Récupérer les valeurs d'une entité
 *     tags: [CustomFields]
 */
router.get('/values/:entityId', CustomFieldController.getValues);

export { router as customFieldRoutes };
