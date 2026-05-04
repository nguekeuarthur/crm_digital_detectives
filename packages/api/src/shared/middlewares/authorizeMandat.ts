import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { prisma } from '../prisma';

/**
 * Middleware de vérification d'accès au mandat
 * Vérifie que l'utilisateur est assigné au mandat demandé
 * Les ADMIN passent toujours, les ENQUETEUR/SOUS_TRAITANT doivent être assignés
 *
 * Usage: router.get('/mandats/:mandatId', authenticate, authorizeMandat, handler)
 */
export const authorizeMandat = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
    });
  }

  // Les admins ont accès à tous les mandats
  if (req.user.role === 'ADMIN') {
    return next();
  }

  const mandatId = req.params.mandatId || req.params.id;

  if (!mandatId) {
    return next(); // Pas de mandat spécifique demandé, on laisse passer
  }

  const mandat = await prisma.mandat.findUnique({
    where: { id: mandatId },
    select: { enqueteurId: true },
  });

  if (!mandat) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Mandat non trouvé' },
    });
  }

  if (mandat.enqueteurId !== req.user.userId) {
    // Logger la tentative d'accès non autorisée
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'ACCESS_DENIED',
        entity: 'Mandat',
        entityId: mandatId,
        ipAddress: req.ip,
      },
    });

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Vous n\'êtes pas assigné à ce mandat',
      },
    });
  }

  next();
};
