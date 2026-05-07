import crypto from 'crypto';

/**
 * Utilitaire pour le chiffrement/déchiffrement des fichiers (AES-256-CBC)
 */
export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-cbc';
  // On récupère la clé depuis le .env (elle doit faire 32 caractères pour AES-256)
  private static readonly KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default_key_of_32_characters_1234', 'utf8').slice(0, 32);

  /**
   * Chiffre un buffer
   */
  static encrypt(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(16); // Vecteur d'initialisation aléatoire
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    // On retourne l'IV suivi du contenu chiffré (besoin de l'IV pour déchiffrer)
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Déchiffre un buffer
   */
  static decrypt(buffer: Buffer): Buffer {
    // Les 16 premiers octets sont l'IV
    const iv = buffer.slice(0, 16);
    const encryptedData = buffer.slice(16);
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
    
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
}
