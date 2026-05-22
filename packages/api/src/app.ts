import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import { csrfProtection, xssSanitizer } from './shared/middlewares';

import { authenticate } from './shared/middlewares/authenticate';
import { authRoutes } from './modules/auth/auth.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { mandatRoutes } from './modules/mandat/mandat.routes';
import { clientRoutes } from './modules/client/client.routes';
import { fileRoutes } from './modules/file/file.routes';
import { customFieldRoutes } from './modules/custom-fields/custom-field.routes';
import { subcontractorRoutes } from './modules/subcontractor/subcontractor.routes';
import { timeEntryRoutes } from './modules/time-entry/time-entry.routes';
import { billingRoutes } from './modules/billing/billing.routes';
import { syncRouter, webhookRouter } from './modules/sync/sync.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { quoteRouter } from './modules/quote/quote.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { retentionRoutes } from './modules/retention/retention.routes';
import { ExportController } from './modules/export/export.controller';
import { initCronJobs } from './shared/cron';
// Les futurs modules seront ajoutés ici :
// app.use('/api/v1/clients', clientRoutes);
// app.use('/api/v1/mandats', mandatRoutes);
// app.use('/api/v1/files', fileRoutes);

import { ZodError } from 'zod';

const app = express();

// Initialisation des tâches de fond
initCronJobs();

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

// Redirection HTTPS en production
if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Middlewares de sécurité et utilitaires
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(xssSanitizer);
app.use(csrfProtection);
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
app.use('/api/v1/webhooks', webhookRouter); // Webhooks WP → CRM (publiques, sécurisées par secret)
app.get('/api/v1/files/download-export/:id', ExportController.downloadExport);

// ─── Middleware d'authentification global ───
// Toutes les routes déclarées APRÈS cette ligne sont protégées
app.use('/api/v1', authenticate);

// ─── Routes protégées (nécessitent un token valide) ───
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin', retentionRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/mandates', mandatRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1', fileRoutes);
app.use('/api/v1/custom-fields', customFieldRoutes);
app.use('/api/v1/subcontractors', subcontractorRoutes);
app.use('/api/v1/time-entries', timeEntryRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/sync', syncRouter);
// webhookRouter est monté AVANT authenticate (voir ligne 95)
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/quotes', quoteRouter);

// Middleware de gestion d'erreurs global
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: string; details?: unknown }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        message: 'Erreur de validation des données',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((e) => ({ path: e.path, message: e.message }))
      }
    });
  }

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Erreur Interne du Serveur',
      code: err.code || 'INTERNAL_ERROR',
      details: err.details
    }
  });
});

export { app };
