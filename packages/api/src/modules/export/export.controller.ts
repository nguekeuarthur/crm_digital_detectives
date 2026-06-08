import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../shared/prisma';
import { ExportService } from './export.service';
import { AuthRequest } from '../../shared/middlewares/authenticate';

const EXPORTS_DIR = path.join(process.env.STORAGE_PATH || './uploads', 'exports');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-12345';

export class ExportController {
  /**
   * Télécharge un export ZIP de données via un token de sécurité temporaire (route publique)
   */
  static async downloadExport(req: Request, res: Response) {
    const { id } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token de téléchargement requis' }
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { exportId: string; userId: string };

      if (decoded.exportId !== id) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Token de téléchargement invalide pour cet export' }
        });
      }

      const zipPath = path.join(EXPORTS_DIR, `${id}.zip`);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: "Le fichier d'export demandé n'existe plus ou a expiré" }
        });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="export-${id}.zip"`);
      
      const fileStream = fs.createReadStream(zipPath);
      fileStream.pipe(res);

    } catch (err) {
      console.error('[EXPORT] Erreur lors du téléchargement de l\'export :', err);
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token de téléchargement expiré ou invalide' }
      });
    }
  }

  /**
   * Déclenche l'export d'un mandat (route protégée)
   */
  static async exportMandate(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non connecté' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    const userEmail = user?.email;
    if (!userEmail) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Utilisateur non trouvé' }
      });
    }

    const mandat = await prisma.mandat.findFirst({
      where: { id, deletedAt: null }
    });

    if (!mandat) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Mandat non trouvé' }
      });
    }

    const exportId = await ExportService.generateMandateExport(id, userId, userEmail);

    res.json({
      message: "L'exportation du mandat a commencé en arrière-plan. Vous recevrez un e-mail avec le lien de téléchargement.",
      exportId
    });
  }

  /**
   * Déclenche l'export d'un client (route protégée)
   */
  static async exportClient(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non connecté' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    const userEmail = user?.email;
    if (!userEmail) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Utilisateur non trouvé' }
      });
    }

    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null }
    });

    if (!client) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Client non trouvé' }
      });
    }

    const exportId = await ExportService.generateClientExport(id, userId, userEmail);

    res.json({
      message: "L'exportation des données du client a commencé en arrière-plan. Vous recevrez un e-mail avec le lien de téléchargement.",
      exportId
    });
  }

  /**
   * Déclenche l'export global du système (route protégée - Admin seul)
   */
  static async exportGlobal(req: AuthRequest, res: Response) {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non connecté' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    const userEmail = user?.email;
    if (!userEmail) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Utilisateur non trouvé' }
      });
    }

    const exportId = await ExportService.generateGlobalExport(userId, userEmail);

    res.json({
      message: "L'exportation globale du système a commencé en arrière-plan. Vous recevrez un e-mail avec le lien de téléchargement.",
      exportId
    });
  }
}
