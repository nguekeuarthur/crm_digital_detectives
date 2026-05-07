// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middlewares';
import { FileService } from './file.service';
import multer from 'multer';
import { ValidationError } from '../../shared/errors';

// Configuration Multer en mémoire (on ne stocke rien sur le disque du serveur API)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(new ValidationError('Type de fichier non autorisé') as any);
    }
  }
});

export class FileController {
  static uploadMiddleware = upload.single('file');

  static async upload(req: AuthRequest, res: Response) {
    if (!req.file) {
      throw new ValidationError('Aucun fichier fourni');
    }

    const { folderId } = req.params;
    
    const file = await FileService.uploadFile({
      name: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      size: req.file.size,
      folderId,
      userId: req.user!.userId
    });

    res.status(201).json(file);
  }

  static async download(req: AuthRequest, res: Response) {
    const result = await FileService.getDownloadUrl(req.params.id, req.user!.userId);
    res.json(result);
  }

  static async stream(req: AuthRequest, res: Response) {
    const buffer = await FileService.getFileBuffer(req.params.id);
    const file = await FileService.getById(req.params.id);
    
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(buffer);
  }

  static async getMetadata(req: AuthRequest, res: Response) {
    const file = await FileService.getById(req.params.id);
    res.json({
      exif: file.exifData,
      geo: {
        lat: file.geoLat,
        lng: file.geoLng
      }
    });
  }

  static async delete(req: AuthRequest, res: Response) {
    await FileService.deleteFile(req.params.id, req.user!.userId);
    res.status(204).send();
  }
}
