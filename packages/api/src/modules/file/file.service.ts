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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } else if (data.mimeType === 'video/mp4') {
      try {
        const gps = extractMp4Gps(data.buffer);
        const creationDate = extractMp4CreationDate(data.buffer);
        if (gps || creationDate) {
          exifData = {
            DateTimeOriginal: creationDate ? creationDate.toISOString() : undefined,
            GPSLatitude: gps?.geoLat || undefined,
            GPSLongitude: gps?.geoLng || undefined
          };
          geoLat = gps?.geoLat || null;
          geoLng = gps?.geoLng || null;
        }
      } catch (err) {
        console.warn('Impossible d\'extraire les métadonnées MP4:', err);
      }
    }

    // 5. Création en base
    const file = await prisma.file.create({
      data: {
        name: data.name,
        key,
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

export function extractMp4Gps(buffer: Buffer): { geoLat: number | null, geoLng: number | null } | null {
  // Search for the ©xyz atom (0xa9 0x78 0x79 0x7a)
  const target = Buffer.from([0xa9, 0x78, 0x79, 0x7a]);
  let index = buffer.indexOf(target);
  if (index === -1) {
    // Try 'xyz ' atom (0x78 0x79 0x7a 0x20)
    const target2 = Buffer.from([0x78, 0x79, 0x7a, 0x20]);
    index = buffer.indexOf(target2);
    if (index === -1) return null;
  }
  
  try {
    // Slices 45 bytes around coordinates string
    const dataSlice = buffer.subarray(index + 4, index + 45).toString('utf-8');
    // Regex matches ISO 6709: e.g. +46.2044+006.1432/ or +46-006/
    const regex = /([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/;
    const match = dataSlice.match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { geoLat: lat, geoLng: lng };
      }
    }
  } catch (err) {
    console.warn('[MP4 GPS] Error parsing coordinate string:', err);
  }
  return null;
}

export function extractMp4CreationDate(buffer: Buffer): Date | null {
  const mvhd = Buffer.from([0x6d, 0x76, 0x68, 0x64]); // 'mvhd'
  const index = buffer.indexOf(mvhd);
  if (index === -1) return null;
  try {
    const version = buffer.readUInt8(index + 4);
    let secondsSince1904 = 0;
    if (version === 0) {
      secondsSince1904 = buffer.readUInt32BE(index + 8);
    } else if (version === 1) {
      const high = buffer.readUInt32BE(index + 8);
      const low = buffer.readUInt32BE(index + 12);
      secondsSince1904 = high * 4294967296 + low;
    }
    if (secondsSince1904 === 0) return null;
    const epochDifference = 2082844800; // Seconds between 1904-01-01 and 1970-01-01
    const unixSeconds = secondsSince1904 - epochDifference;
    return new Date(unixSeconds * 1000);
  } catch (err) {
    console.warn('[MP4 DATE] Error parsing date:', err);
  }
  return null;
}
