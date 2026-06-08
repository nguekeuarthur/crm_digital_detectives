import { Request, Response } from 'express';
import { NikonService } from './nikon.service';
import multer from 'multer';
import { ValidationError } from '../../shared/errors';

// Configuration Multer pour Nikon Cloud
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (largement suffisant pour des photos JPEG/RAW)
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/heic', 'image/tiff',
      'video/mp4', 'video/quicktime'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(new ValidationError('Type de fichier Nikon non autorisé') as any);
    }
  }
});

export class NikonController {
  static uploadMiddleware = upload.single('file');

  /**
   * Endpoint de réception Webhook / Upload automatique
   */
  static async upload(req: Request, res: Response) {
    // 1. Validation de la clé d'API de sécurité (si configurée en .env)
    const expectedKey = process.env.NIKON_API_KEY || 'nikon_secret_integration_key_2026';
    const clientKey = req.headers['x-nikon-key'];

    if (expectedKey && clientKey !== expectedKey) {
      return res.status(401).json({
        error: {
          message: 'Clé de sécurité Nikon incorrecte ou absente.',
          code: 'UNAUTHORIZED'
        }
      });
    }

    // 2. Vérification de la présence du fichier
    if (!req.file) {
      throw new ValidationError('Aucun fichier photo Nikon fourni.');
    }

    // 3. Extraction du tag/dossier de routage
    const tag = req.body.tag || req.body.folder || req.query.tag || req.query.folder;

    // 4. Importation et routage de la photo
    const result = await NikonService.importPhoto({
      filename: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      size: req.file.size,
      tag: tag ? String(tag) : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Photo Nikon importée et classée avec succès.',
      data: {
        fileId: result.file.id,
        fileName: result.file.name,
        mandateId: result.mandate.id,
        mandateTitle: result.mandate.title,
        geoLat: result.file.geoLat,
        geoLng: result.file.geoLng
      }
    });
  }
}
