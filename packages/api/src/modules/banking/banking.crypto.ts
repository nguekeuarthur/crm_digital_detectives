import { EncryptionUtils } from '../../shared/encryption';

/**
 * Chiffrement des jetons OAuth bancaires (AES-256-CBC, même clé que les preuves).
 * Les jetons ne doivent jamais être stockés en clair en base.
 */
export function encryptSecret(value: string): string {
  return EncryptionUtils.encrypt(Buffer.from(value, 'utf8')).toString('base64');
}

export function decryptSecret(value?: string | null): string | null {
  if (!value) return null;
  try {
    return EncryptionUtils.decrypt(Buffer.from(value, 'base64')).toString('utf8');
  } catch (error) {
    console.error('❌ [Banking] Impossible de déchiffrer un jeton bancaire :', error);
    return null;
  }
}
