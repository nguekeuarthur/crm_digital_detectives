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
 *     summary: Saisir des heures sur un mandat (Sous-traitant ou Admin)
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mandatId, date, hours]
 *             properties:
 *               mandatId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-20"
 *               hours:
 *                 type: number
 *                 example: 4.5
 *                 description: Nombre d'heures travaillées
 *               description:
 *                 type: string
 *                 example: Surveillance secteur Eaux-Vives
 *     responses:
 *       201:
 *         description: Saisie d'heures enregistrée (en attente de validation Admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 mandatId:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                 hours:
 *                   type: number
 *                 validated:
 *                   type: boolean
 *                   example: false
 *                 invoiced:
 *                   type: boolean
 *                   example: false
 *       422:
 *         description: Erreur de validation
 */
router.post('/', authorize('SOUS_TRAITANT', 'ADMIN'), TimeEntryController.create);

/**
 * @openapi
 * /time-entries/{id}/validate:
 *   patch:
 *     summary: Valider une saisie d'heures (Admin uniquement)
 *     tags: [TimeEntries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Saisie validée (validated = true)
 *       404:
 *         description: Saisie non trouvée
 */
router.patch('/:id/validate', authorize('ADMIN'), TimeEntryController.validate);

export { router as timeEntryRoutes };
