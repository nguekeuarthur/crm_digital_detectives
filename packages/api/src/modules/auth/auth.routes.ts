import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../shared/middlewares/authenticate';

const router = Router();

// --- PUBLIC ROUTES ---

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Créer un nouveau compte utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: detective@genevadetectives.ch
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecureP@ss123
 *               firstName:
 *                 type: string
 *                 example: Jean
 *               lastName:
 *                 type: string
 *                 example: Dupont
 *               role:
 *                 type: string
 *                 enum: [ADMIN, ENQUETEUR, SOUS_TRAITANT]
 *                 default: ENQUETEUR
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 role:
 *                   type: string
 *       422:
 *         description: Erreur de validation des données
 */
router.post('/register', AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connexion (retourne les tokens ou demande la 2FA)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens JWT (si 2FA désactivée) ou demande de code 2FA
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                 - type: object
 *                   properties:
 *                     require2FA:
 *                       type: boolean
 *                       example: true
 *                     userId:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Email ou mot de passe incorrect
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/login-2fa:
 *   post:
 *     summary: Valider le code TOTP et obtenir les tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: Code TOTP à 6 chiffres
 *     responses:
 *       200:
 *         description: Tokens JWT après validation 2FA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Code TOTP invalide
 */
router.post('/login-2fa', AuthController.login2FA);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rafraîchir l'access token via le refresh token (rotation)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveaux tokens (l'ancien refresh token est révoqué)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *     summary: Rafraîchir l'Access Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveaux tokens
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /auth/users:
 *   get:
 *     summary: Lister les utilisateurs (avec filtre optionnel sur le rôle)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 */
router.get('/users', authenticate, AuthController.getUsers);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (révoque le refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       204:
 *         description: Déconnexion réussie
 */
router.post('/logout', AuthController.logout);

/**
 * @openapi
 * /auth/csrf-token:
 *   get:
 *     summary: Récupérer un jeton CSRF valide
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Jeton CSRF généré ou existant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get('/csrf-token', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json({ csrfToken: (req as any).csrfToken });
});

// --- PROTECTED ROUTES (Profile & 2FA Management) ---
router.use(authenticate);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [ADMIN, ENQUETEUR, SOUS_TRAITANT]
 *                 isTwoFactorEnabled:
 *                   type: boolean
 *       401:
 *         description: Non authentifié
 */
router.get('/me', AuthController.getMe);

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Générer le QR Code pour configurer la 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR Code et secret TOTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: Data URI du QR Code (base64)
 *                 secret:
 *                   type: string
 *                   description: Secret TOTP (pour saisie manuelle)
 *       401:
 *         description: Non authentifié
 */
router.post('/2fa/setup', AuthController.setup2FA);

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Vérifier le code TOTP et activer la 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA activée avec succès
 *       400:
 *         description: Code invalide
 *       401:
 *         description: Non authentifié
 */
router.post('/2fa/verify', AuthController.verify2FA);

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     summary: Désactiver la 2FA (Admin ou Propriétaire)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA désactivée
 *       401:
 *         description: Non authentifié
 */
router.post('/2fa/disable', AuthController.disable2FA);

export { router as authRoutes };
