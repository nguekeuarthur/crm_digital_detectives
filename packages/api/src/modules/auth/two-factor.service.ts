import { prisma } from '../../shared/prisma';
import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { AuditService } from '../audit/audit.service';

export class TwoFactorService {
  /**
   * Génère un secret et un QR Code pour l'utilisateur
   */
  static async setup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur non trouvé');

    const secret = generateSecret();
    const otpauth = generateURI({
      secret,
      label: user.email,
      issuer: 'DigitalDetectives'
    });
    const qrCode = await qrcode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    return { secret, qrCode };
  }

  /**
   * Valide le premier code et active définitivement la 2FA
   */
  static async verifyAndEnable(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new Error('Setup 2FA non initié');

    console.log(`[2FA Debug] Code reçu: "${code}" | Secret en DB: "${user.twoFactorSecret.substring(0, 6)}..."`);

    try {
      // verifySync prend le secret en paramètre directement — pas de classe à configurer
      const isValid = verifySync({
        token: code,
        secret: user.twoFactorSecret,
        window: 4
      });

      console.log(`[2FA Debug] Résultat: ${isValid}`);

      if (!isValid) return false;
    } catch (error) {
      console.error(`[2FA Debug] Erreur: ${(error as Error).message}`);
      return false;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true }
    });

    await AuditService.log({
      userId,
      action: 'ENABLE_2FA',
      entity: 'User',
      entityId: userId
    });

    return true;
  }

  /**
   * Désactive la 2FA
   */
  static async disable(userId: string, adminId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    await AuditService.log({
      userId: adminId,
      action: 'DISABLE_2FA',
      entity: 'User',
      entityId: userId
    });
  }

  /**
   * Vérifie un code (pour le flow de login)
   */
  static async validateCode(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return false;

    try {
      return verifySync({
        token: code,
        secret: user.twoFactorSecret,
        window: 4
      });
    } catch {
      return false;
    }
  }
}
