import { Router } from 'express';
import { TimeEntryController } from './time-entry.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /time-entries:
 *   post:
 *     summary: Saisir des heures sur un mandat (Sous-traitant)
 *     tags: [TimeEntries]
 */
router.post('/', authorize('SOUS_TRAITANT', 'ADMIN'), TimeEntryController.create);

/**
 * @openapi
 * /time-entries/{id}/validate:
 *   patch:
 *     summary: Valider une saisie d'heures (Admin)
 *     tags: [TimeEntries]
 */
router.patch('/:id/validate', authorize('ADMIN'), TimeEntryController.validate);

export { router as timeEntryRoutes };
