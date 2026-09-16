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
 *     summary: Créer une définition de champ personnalisé (Admin)
 *     tags: [CustomFields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, entityType]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Numéro de dossier interne
 *               type:
 *                 type: string
 *                 enum: [TEXT, NUMBER, DATE, BOOLEAN, SELECT]
 *               entityType:
 *                 type: string
 *                 enum: [MANDATE, CLIENT]
 *                 description: Type d'entité auquel ce champ s'applique
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Options pour les champs de type SELECT
 *                 example: ["Prioritaire", "Normal", "Basse priorité"]
 *     responses:
 *       201:
 *         description: Définition de champ créée
 *       422:
 *         description: Erreur de validation
 */
router.post('/definitions', authorize('ADMIN'), CustomFieldController.createDefinition);

/**
 * @openapi
 * /custom-fields/definitions:
 *   get:
 *     summary: Récupérer les définitions de champs par type d'entité
 *     tags: [CustomFields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema: { type: string, enum: [MANDATE, CLIENT] }
 *     responses:
 *       200:
 *         description: Liste des définitions de champs personnalisés
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [TEXT, NUMBER, DATE, BOOLEAN, SELECT]
 *                   entityType:
 *                     type: string
 *                   options:
 *                     type: array
 *                     items:
 *                       type: string
 *                     nullable: true
 */
router.get('/definitions', CustomFieldController.getDefinitions);

/**
 * @openapi
 * /custom-fields/definitions/{id}:
 *   delete:
 *     summary: Supprimer une définition de champ (Admin — supprime toutes les valeurs associées)
 *     tags: [CustomFields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Définition et valeurs associées supprimées
 *       404:
 *         description: Définition non trouvée
 */
router.delete('/definitions/:id', authorize('ADMIN'), CustomFieldController.deleteDefinition);

/**
 * @openapi
 * /custom-fields/values:
 *   post:
 *     summary: Enregistrer ou mettre à jour des valeurs de champs pour une entité
 *     tags: [CustomFields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entityId, entityType, values]
 *             properties:
 *               entityId:
 *                 type: string
 *                 format: uuid
 *                 description: ID du Mandat ou du Client
 *               entityType:
 *                 type: string
 *                 enum: [MANDATE, CLIENT]
 *               values:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [fieldDefinitionId, value]
 *                   properties:
 *                     fieldDefinitionId:
 *                       type: string
 *                       format: uuid
 *                     value:
 *                       type: string
 *                       description: Valeur stockée en string (castée selon le type du champ)
 *     responses:
 *       200:
 *         description: Valeurs enregistrées (upsert)
 *       422:
 *         description: Erreur de validation
 */
router.post('/values', CustomFieldController.setValues);

/**
 * @openapi
 * /custom-fields/values/{entityId}:
 *   get:
 *     summary: Récupérer les valeurs des champs personnalisés d'une entité
 *     tags: [CustomFields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID du Mandat ou du Client
 *       - in: query
 *         name: entityType
 *         schema: { type: string, enum: [MANDATE, CLIENT] }
 *     responses:
 *       200:
 *         description: Valeurs des champs personnalisés
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   fieldDefinitionId:
 *                     type: string
 *                   value:
 *                     type: string
 *                   definition:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 */
router.get('/values/:entityId', CustomFieldController.getValues);

export { router as customFieldRoutes };
