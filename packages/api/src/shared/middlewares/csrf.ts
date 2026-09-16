import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware de protection contre les failles CSRF (Double Submit Cookie)
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 1. Générer et injecter un CSRF token s'il n'existe pas dans les cookies
  let csrfToken = req.cookies?.csrfToken;

  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      httpOnly: false // Permet au client JS de le lire pour l'injecter dans les headers
    });
  }

  // Stocker le token sur l'objet request pour un accès facile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).csrfToken = csrfToken;

  // 2. Ignorer la vérification pour les méthodes de lecture sécurisées
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 3. Ignorer la vérification pour les webhooks externes (Stripe, Mollie, WordPress, etc.)
  if (
    req.originalUrl.startsWith('/api/v1/webhooks') ||
    req.originalUrl.startsWith('/api/v1/nikon')
  ) {
    return next();
  }

  // 4. Valider la correspondance entre le cookie et le header
  const headerToken = req.headers['x-csrf-token'];

  if (!headerToken || !csrfToken || headerToken !== csrfToken) {
    return res.status(403).json({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Validation CSRF échouée. Jeton invalide ou manquant.'
      }
    });
  }

  next();
};
