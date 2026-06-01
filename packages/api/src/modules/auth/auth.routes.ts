import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../shared/middlewares/authenticate';

const router = Router();

// --- PUBLIC ROUTES ---
router.post('/register', AuthController.register);
router.post('/register/verify-2fa', AuthController.verifyRegistration2FA);
router.post('/login', AuthController.login);
router.post('/login-2fa', AuthController.login2FA);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// --- PROTECTED ROUTES (Profile & 2FA Management) ---
router.use(authenticate);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Auth]
 */
router.get('/me', AuthController.getMe);

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Générer le QR Code pour configurer la 2FA
 *     tags: [Auth]
 */
router.post('/2fa/setup', AuthController.setup2FA);

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Vérifier le code et activer la 2FA
 *     tags: [Auth]
 */
router.post('/2fa/verify', AuthController.verify2FA);

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     summary: Désactiver la 2FA (Admin ou Propriétaire)
 *     tags: [Auth]
 */
router.post('/2fa/disable', AuthController.disable2FA);

export { router as authRoutes };
