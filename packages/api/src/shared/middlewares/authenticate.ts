import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    sessionId: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Token manquant ou format invalide' } 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; sessionId: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' } 
    });
  }
};
