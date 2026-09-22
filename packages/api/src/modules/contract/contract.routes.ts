import { Router } from 'express';
import { ContractController } from './contract.controller';
import { SignatureController } from '../signature/signature.controller';
import { authorize, authorizeContract } from '../../shared/middlewares';

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

/**
 * @openapi
 * /contracts/{id}/send-for-signature:
 *   post:
 *     summary: Envoyer le contrat au client pour signature électronique
 *     description: >
 *       Crée la demande chez le prestataire et lui fait adresser une invitation
 *       au client, qui n'a besoin d'aucun compte. Le niveau de signature suit
 *       SIGNATURE_QUALITY, sauf indication contraire dans le corps.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/send-for-signature', authorize('ADMIN', 'ENQUETEUR'), authorizeContract, SignatureController.envoyerPourSignature);

/**
 * @openapi
 * /contracts/{id}/withdraw-signature:
 *   post:
 *     summary: Annuler une demande de signature en cours
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/withdraw-signature', authorize('ADMIN', 'ENQUETEUR'), authorizeContract, SignatureController.annuler);

/**
 * @openapi
 * /contracts/{id}/simulate-signature:
 *   post:
 *     summary: Faire aboutir une demande simulée (mise au point)
 *     description: Refusé si SIGNATURE_PROVIDER ne vaut pas MOCK.
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/simulate-signature', authorize('ADMIN'), SignatureController.simuler);

export { router as contractRoutes };
