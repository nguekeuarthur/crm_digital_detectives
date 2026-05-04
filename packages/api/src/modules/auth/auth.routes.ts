import { Router } from 'express';
import { AuthController } from './auth.controller';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     description: "🔓 Route publique — aucune authentification requise"
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
 *       400:
 *         description: Données invalides
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     description: "🔓 Route publique — aucune authentification requise"
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
 *         description: Succès, retourne { accessToken, refreshToken }
 *       401:
 *         description: Email ou mot de passe incorrect
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rafraîchir l'access token
 *     description: "🔓 Route publique — utilise le refreshToken au lieu du Bearer"
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
 *         description: Nouveaux tokens (rotation effectuée)
 *       401:
 *         description: Refresh token invalide ou révoqué
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (révocation du refresh token)
 *     description: "🔓 Route publique — révoque le refresh token en base"
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
