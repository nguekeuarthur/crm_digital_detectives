import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { EncryptionUtils } from '../../shared/encryption';

// --- Configuration S3 (Optionnel) ---
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://s3.cloud.infomaniak.com',
  region: process.env.S3_REGION || 'lyon',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

export class StorageService {
  private static readonly strategy = process.env.STORAGE_STRATEGY || 'LOCAL';
  private static readonly bucket = process.env.S3_BUCKET || 'digital-detectives-files';
  private static readonly localPath = process.env.STORAGE_PATH || './uploads';

  /**
   * Initialise le dossier de stockage local si besoin
   */
  private static ensureLocalFolder(key: string) {
    const fullPath = path.join(this.localPath, path.dirname(key));
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Upload d'un fichier (Chiffre avant stockage si LOCAL)
   */
  static async uploadFile(key: string, body: Buffer, contentType: string) {
    if (this.strategy === 'S3') {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      return s3Client.send(command);
    } else {
      // Stratégie LOCAL
      this.ensureLocalFolder(key);
      const fullPath = path.join(this.localPath, key);
      
      // CHIFFREMENT avant sauvegarde
      const encryptedBody = EncryptionUtils.encrypt(body);
      
      fs.writeFileSync(fullPath, encryptedBody);
      return { success: true, path: fullPath };
    }
  }

  /**
   * Récupère le contenu d'un fichier (Déchiffre si LOCAL)
   */
  static async getFile(key: string): Promise<Buffer> {
    if (this.strategy === 'S3') {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await s3Client.send(command);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = response.Body as any;
      return new Promise((resolve, reject) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chunks: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } else {
      const fullPath = path.join(this.localPath, key);
      const encryptedBuffer = fs.readFileSync(fullPath);
      
      // DÉCHIFFREMENT avant retour
      return EncryptionUtils.decrypt(encryptedBuffer);
    }
  }

  /**
   * Génération d'une URL ou d'un flux pour le téléchargement
   */
  static async getDownloadUrl(key: string) {
    if (this.strategy === 'S3') {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } else {
      // Pour le local, on retourne une route interne d'API
      // On verra comment gérer ça dans le controller
      return `/api/v1/files/stream?key=${encodeURIComponent(key)}`;
    }
  }

  /**
   * Suppression
   */
  static async deleteFile(key: string) {
    if (this.strategy === 'S3') {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return s3Client.send(command);
    } else {
      const fullPath = path.join(this.localPath, key);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}
