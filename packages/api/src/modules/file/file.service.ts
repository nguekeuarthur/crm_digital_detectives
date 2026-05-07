import { prisma } from '../../shared/prisma';
import { StorageService } from './storage.service';
import { AuditService } from '../audit/audit.service';
import { ValidationError } from '../../shared/errors';
import { ActivityService } from '../mandat/activity.service';
import exifr from 'exifr';

export class FileService {
  /**
   * Enregistre un fichier et l'uploade vers le stockage
   */
  static async uploadFile(data: {
    name: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
    folderId: string;
    userId: string;
  }) {
    // 1. Vérification du dossier
    const folder = await prisma.dossier.findUnique({
      where: { id: data.folderId }
    });
    if (!folder) throw new ValidationError('Dossier non trouvé');

    // 2. Génération de la clé unique S3 (chemin relatif)
    // Format: mandats/mandatId/folderId/timestamp-name
    const key = `mandats/${folder.mandatId}/${folder.id}/${Date.now()}-${data.name}`;

    // 3. Upload vers S3
    await StorageService.uploadFile(key, data.buffer, data.mimeType);

    // 4. Extraction des métadonnées EXIF (si image/vidéo)
    let exifData: any = null;
    let geoLat: number | null = null;
    let geoLng: number | null = null;

    if (data.mimeType.startsWith('image/')) {
      try {
        const metadata = await exifr.parse(data.buffer, {
          pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Make', 'Model', 'Software'],
          gps: true
        });
        
        if (metadata) {
          exifData = metadata;
          geoLat = metadata.latitude || null;
          geoLng = metadata.longitude || null;
        }
      } catch (err) {
        console.warn('Impossible d\'extraire les métadonnées EXIF:', err);
      }
    }

    // 5. Création en base
    const file = await prisma.file.create({
      data: {
        name: data.name,
        key: key,
        size: data.size,
        mimeType: data.mimeType,
        folderId: data.folderId,
        userId: data.userId,
        exifData,
        geoLat,
        geoLng
      }
    });

    // 5. Audit Log
    await AuditService.log({
      userId: data.userId,
      action: 'UPLOAD_FILE',
      entity: 'File',
      entityId: file.id,
      newValue: { name: file.name, key: file.key }
    });

    // 6. Activity Log
    await ActivityService.push({
      mandatId: folder.mandatId,
      userId: data.userId,
      type: 'FILE_ADDED',
      payload: { fileName: file.name, folderName: folder.name }
    });

    return file;
  }

  /**
   * Génère un lien de téléchargement sécurisé ou prépare le streaming
   */
  static async getDownloadUrl(fileId: string, userId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file || file.deletedAt) throw new ValidationError('Fichier non trouvé');

    // Si on est en S3, on retourne l'URL présignée
    // Si on est en LOCAL, on retourne un flag pour que le controller streame le contenu
    const strategy = process.env.STORAGE_STRATEGY || 'LOCAL';
    
    let url = '';
    if (strategy === 'S3') {
      url = await StorageService.getDownloadUrl(file.key);
    } else {
      // On retourne une info spéciale que le controller va utiliser
      url = `/api/v1/files/stream/${file.id}`;
    }

    await AuditService.log({
      userId,
      action: 'DOWNLOAD_FILE',
      entity: 'File',
      entityId: fileId
    });

    return { url, isLocal: strategy === 'LOCAL' };
  }

  /**
   * Récupère le buffer déchiffré d'un fichier (pour le streaming)
   */
  static async getFileBuffer(fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });
    if (!file) throw new ValidationError('Fichier non trouvé');
    return await StorageService.getFile(file.key);
  }

  /**
   * Suppression (Soft Delete)
   */
  static async deleteFile(fileId: string, userId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) throw new ValidationError('Fichier non trouvé');

    // Soft delete en base
    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() }
    });

    await AuditService.log({
      userId,
      action: 'DELETE_FILE',
      entity: 'File',
      entityId: fileId
    });

    // Note: La suppression physique différée pourrait être gérée par un worker
  }

  static async getById(id: string) {
    const file = await prisma.file.findUnique({
      where: { id }
    });
    if (!file) throw new ValidationError('Fichier non trouvé');
    return file;
  }
}
