import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: Utilisateur créé
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Succès, retourne les tokens
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rafraîchir l'access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nouveaux tokens
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (révocation du refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204:
 *         description: Déconnecté avec succès
 */
router.post('/logout', AuthController.logout);

export { router as authRoutes };
