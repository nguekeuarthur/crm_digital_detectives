import { prisma } from '../../shared/prisma';
import { FileService } from '../file/file.service';
import { broadcastCallEvent } from '../../shared/websocket';
import { ValidationError } from '../../shared/errors';

export class NikonService {
  /**
   * Importe et route automatiquement une photo provenant de Nikon Cloud
   */
  static async importPhoto(data: {
    filename: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
    tag?: string;
  }) {
    let matchedMandate = null;

    // 1. Essayer de faire correspondre avec le tag (dossier ou tag Nikon)
    if (data.tag) {
      // Recherche d'un ID numérique de mandat de 10 à 15 chiffres
      const mandateIdMatch = data.tag.match(/\d{10,15}/);
      const searchId = mandateIdMatch ? mandateIdMatch[0] : data.tag;
      
      matchedMandate = await prisma.mandat.findUnique({
        where: { id: searchId }
      });
    }

    // 2. Si non trouvé, essayer d'extraire l'ID du mandat du nom de fichier
    if (!matchedMandate && data.filename) {
      const mandateIdMatch = data.filename.match(/\d{10,15}/);
      if (mandateIdMatch) {
        matchedMandate = await prisma.mandat.findUnique({
          where: { id: mandateIdMatch[0] }
        });
      }
    }

    // 3. Fallback : Trouver le dernier mandat ouvert (le plus récent)
    if (!matchedMandate) {
      matchedMandate = await prisma.mandat.findFirst({
        where: { status: 'OUVERT' },
        orderBy: { createdAt: 'desc' }
      });
    }

    // 4. Si aucun mandat n'est trouvé, lever une erreur
    if (!matchedMandate) {
      throw new ValidationError('Aucun mandat actif trouvé pour classer cette preuve Nikon.');
    }

    // 5. Trouver ou créer le dossier système "Preuves Photographiques" pour ce mandat
    let folder = await prisma.dossier.findFirst({
      where: {
        mandatId: matchedMandate.id,
        name: 'Preuves Photographiques'
      }
    });

    if (!folder) {
      folder = await prisma.dossier.create({
        data: {
          name: 'Preuves Photographiques',
          mandatId: matchedMandate.id,
          isSystem: true
        }
      });
    }

    // 6. Importer le fichier via FileService (l'image sera chiffrée et ses métadonnées EXIF extraites)
    const file = await FileService.uploadFile({
      name: data.filename,
      buffer: data.buffer,
      mimeType: data.mimeType,
      size: data.size,
      folderId: folder.id,
      userId: null // Marqueur d'importation système automatique
    });

    // 7. Notifier le frontend en temps réel par WebSocket
    broadcastCallEvent('NIKON_FILE_IMPORTED', {
      fileId: file.id,
      fileName: file.name,
      mandateId: matchedMandate.id,
      mandateTitle: matchedMandate.title,
      geoLat: file.geoLat,
      geoLng: file.geoLng
    });

    return { file, mandate: matchedMandate };
  }
}
