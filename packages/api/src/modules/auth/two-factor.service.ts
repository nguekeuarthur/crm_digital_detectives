import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { prisma } from '../../shared/prisma';
import { AuditService } from '../audit/audit.service';

export class TwoFactorService {
  static async setup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Utilisateur non trouvé');

    const secret = generateSecret();
    const otpauth = generateURI({
      secret,
      label: user.email,
      issuer: 'DigitalDetectives',
    });
    const qrCode = await qrcode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, qrCode };
  }

  static async verifyAndEnable(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new Error('Setup 2FA non initié');

    const result = verifySync({ token: code, secret: user.twoFactorSecret });
    const isValid = result.valid;

    if (!isValid) return false;

    await prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });

    await AuditService.log({
      userId,
      action: 'ENABLE_2FA',
      entity: 'User',
      entityId: userId,
    });

    return true;
  }

  static async disable(userId: string, adminId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });

    await AuditService.log({
      userId: adminId,
      action: 'DISABLE_2FA',
      entity: 'User',
      entityId: userId,
    });
  }

  static async validateCode(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return false;

    try {
      const result = verifySync({ token: code, secret: user.twoFactorSecret });
      return result.valid;
    } catch {
      return false;
    }
  }
}
