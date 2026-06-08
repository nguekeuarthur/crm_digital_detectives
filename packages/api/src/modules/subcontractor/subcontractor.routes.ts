import { Router } from 'express';
import { SubcontractorController } from './subcontractor.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';

const router = Router();

/**
 * @openapi
 * /subcontractors/accept:
 *   post:
 *     summary: Accepter une invitation sous-traitant (Public — token requis)
 *     tags: [Subcontractors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token d'invitation reçu par email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Mot de passe choisi par le sous-traitant
 *     responses:
 *       201:
 *         description: Compte sous-traitant créé (accès temporaire de 30 jours)
 *       400:
 *         description: Token invalide ou expiré
 */
router.post('/accept', SubcontractorController.accept);

// Routes protégées (Admin seulement)
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @openapi
 * /subcontractors/invite:
 *   post:
 *     summary: Inviter un sous-traitant par email (Admin)
 *     tags: [Subcontractors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation envoyée (token temporaire créé)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: Token d'invitation (également envoyé par email)
 *       409:
 *         description: Email déjà invité
 */
router.post('/invite', SubcontractorController.invite);

/**
 * @openapi
 * /subcontractors/{id}/extend:
 *   patch:
 *     summary: Prolonger l'accès d'un sous-traitant (Admin)
 *     tags: [Subcontractors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID du sous-traitant (User)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [days]
 *             properties:
 *               days:
 *                 type: integer
 *                 example: 30
 *                 description: Nombre de jours supplémentaires d'accès
 *     responses:
 *       200:
 *         description: Accès prolongé
 *       404:
 *         description: Sous-traitant non trouvé
 */
router.patch('/:id/extend', SubcontractorController.extend);

export { router as subcontractorRoutes };
