import { Router } from 'express';
import { SubcontractorController } from './subcontractor.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

/**
 * @openapi
 * /subcontractors/accept:
 *   post:
 *     summary: Accepter une invitation (Public)
 *     tags: [Subcontractors]
 */
router.post('/accept', SubcontractorController.accept);

// Routes protégées (Admin seulement)
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @openapi
 * /subcontractors/invite:
 *   post:
 *     summary: Inviter un sous-traitant
 *     tags: [Subcontractors]
 */
router.post('/invite', SubcontractorController.invite);

/**
 * @openapi
 * /subcontractors/{id}/extend:
 *   patch:
 *     summary: Prolonger l'accès d'un sous-traitant
 *     tags: [Subcontractors]
 */
router.patch('/:id/extend', SubcontractorController.extend);

export { router as subcontractorRoutes };
