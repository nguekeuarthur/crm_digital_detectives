import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { prisma } from '../prisma';

/**
 * Vérification d'accès à un contrat.
 *
 * Même règle qu'authorizeMandat — les ADMIN passent, les autres doivent être
 * assignés — mais appliquée au mandat *porteur* du contrat. Les routes de
 * contrat reçoivent en `:id` l'identifiant du contrat, pas celui du mandat :
 * authorizeMandat, qui lit ce paramètre comme un mandat, n'y répondrait que
 * par des 404.
 *
 * Usage : router.post('/:id/send-for-signature', authorizeContract, handler)
 */
export const authorizeContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentification requise' },
    });
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const contractId = (req.params.contractId || req.params.id) as string;
  if (!contractId) {
    return next();
  }

  const contrat = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { mandatId: true, mandat: { select: { enqueteurId: true } } },
  });

  if (!contrat) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Contrat non trouvé' },
    });
  }

  if (contrat.mandat.enqueteurId !== req.user.userId) {
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'ACCESS_DENIED',
        entity: 'Contract',
        entityId: contractId,
        ipAddress: req.ip,
      },
    });

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Vous n\'êtes pas assigné au mandat de ce contrat',
      },
    });
  }

  next();
};
