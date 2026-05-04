import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    sessionId: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Token manquant ou format invalide' } 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; sessionId: string };

    // Vérification de l'expiration des accès sous-traitant
    if (payload.role === 'SOUS_TRAITANT') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { accessExpiresAt: true },
      });

      if (user?.accessExpiresAt && user.accessExpiresAt < new Date()) {
        await prisma.auditLog.create({
          data: {
            userId: payload.userId,
            action: 'ACCESS_EXPIRED',
            entity: 'User',
            entityId: payload.userId,
            ipAddress: req.ip,
          },
        });

        return res.status(403).json({
          error: { code: 'ACCESS_EXPIRED', message: 'Votre accès temporaire a expiré' },
        });
      }
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' } 
    });
  }
};
