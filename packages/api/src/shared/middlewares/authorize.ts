import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { RoleType } from '../../config/permissions';

/**
 * Middleware d'autorisation par rôle
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés
 *
 * Usage: router.get('/admin', authenticate, authorize('ADMIN'), handler)
 */
export const authorize = (...allowedRoles: RoleType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
      });
    }

    if (!allowedRoles.includes(req.user.role as RoleType)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé : permissions insuffisantes',
        },
      });
    }

    next();
  };
};
