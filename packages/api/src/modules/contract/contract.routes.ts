import { Router } from 'express';
import { ContractController } from './contract.controller';
import { authorize } from '../../shared/middlewares';

const router = Router();

/**
 * @openapi
 * /contracts/templates:
 *   get:
 *     summary: Lister les modèles de contrats actifs
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.get('/templates', authorize('ADMIN', 'ENQUETEUR'), ContractController.listTemplates);

/**
 * @openapi
 * /contracts/templates:
 *   post:
 *     summary: Créer un nouveau modèle de contrat
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/templates', authorize('ADMIN', 'ENQUETEUR'), ContractController.createTemplate);

/**
 * @openapi
 * /contracts/templates/{id}:
 *   put:
 *     summary: Mettre à jour un modèle de contrat (crée une v2)
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.put('/templates/:id', authorize('ADMIN', 'ENQUETEUR'), ContractController.updateTemplate);

/**
 * @openapi
 * /contracts/generate:
 *   post:
 *     summary: Générer un contrat PDF
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/generate', authorize('ADMIN', 'ENQUETEUR'), ContractController.generateContract);
router.post('/', authorize('ADMIN', 'ENQUETEUR'), ContractController.generateContract);

export { router as contractRoutes };
