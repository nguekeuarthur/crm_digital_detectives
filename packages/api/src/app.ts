import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { authRoutes } from './modules/auth/auth.routes';

const app = express();

// Middlewares de base
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});
app.use('/api/auth', authRoutes);

// Middleware de gestion d'erreurs global
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erreur Interne du Serveur',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

export { app };
