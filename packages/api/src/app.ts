import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { authenticate } from './shared/middlewares/authenticate';
import { authRoutes } from './modules/auth/auth.routes';

const app = express();

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digitaldetectives CRM API',
      version: '1.0.0',
      description: 'API pour le CRM de Digitaldetectives',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middlewares de sécurité et utilitaires
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Trop de requêtes, veuillez réessayer plus tard.' } }
});
app.use('/api/', limiter);

// Documentation (accessible sans auth)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health Check (accessible sans auth)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ─── Routes publiques (pas besoin de token) ───
app.use('/api/v1/auth', authRoutes);

// ─── Middleware d'authentification global ───
// Toutes les routes déclarées APRÈS cette ligne sont protégées
app.use('/api/v1', authenticate);

// ─── Routes protégées (nécessitent un token valide) ───
// Les futurs modules seront ajoutés ici :
// app.use('/api/v1/clients', clientRoutes);
// app.use('/api/v1/mandats', mandatRoutes);
// app.use('/api/v1/files', fileRoutes);

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
