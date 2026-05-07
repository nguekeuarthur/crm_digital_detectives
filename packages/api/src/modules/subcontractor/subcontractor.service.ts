import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class SubcontractorService {
  /**
   * Invite un sous-traitant (Admin)
   */
  static async invite(email: string, userId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Valide 48h

    const invite = await prisma.subcontractorInvite.upsert({
      where: { email },
      update: { token, expiresAt },
      create: { email, token, expiresAt }
    });

    // TODO: Envoyer le vrai email via un service type SendGrid/Nodemailer
    // Pour l'instant on logue le lien pour le test
    console.log(`📧 Email d'invitation envoyé à ${email}`);
    console.log(`🔗 Lien: http://localhost:3000/accept-invite?token=${token}`);

    await AuditService.log({
      userId,
      action: 'INVITE_SUBCONTRACTOR',
      entity: 'SubcontractorInvite',
      entityId: invite.id,
      newValue: { email }
    });

    return invite;
  }

  /**
   * Accepte l'invitation et crée le compte
   */
  static async acceptInvite(data: {
    token: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const invite = await prisma.subcontractorInvite.findUnique({
      where: { token: data.token }
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new ValidationError('Invitation invalide ou expirée');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30); // Par défaut 30 jours d'accès

    const user = await prisma.user.create({
      data: {
        email: invite.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'SOUS_TRAITANT',
        accessExpiresAt
      }
    });

    // Supprimer l'invitation
    await prisma.subcontractorInvite.delete({ where: { id: invite.id } });

    await AuditService.log({
      userId: user.id,
      action: 'ACCEPT_INVITE',
      entity: 'User',
      entityId: user.id
    });

    return user;
  }

  /**
   * Prolonge l'accès d'un sous-traitant
   */
  static async extendAccess(subcontractorId: string, days: number, userId: string) {
    const subcontractor = await prisma.user.findUnique({ where: { id: subcontractorId } });
    if (!subcontractor || subcontractor.role !== 'SOUS_TRAITANT') {
      throw new ValidationError('Sous-traitant non trouvé');
    }

    const currentExpiry = subcontractor.accessExpiresAt || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + days);

    const updated = await prisma.user.update({
      where: { id: subcontractorId },
      data: { accessExpiresAt: newExpiry }
    });

    await AuditService.log({
      userId,
      action: 'EXTEND_ACCESS',
      entity: 'User',
      entityId: subcontractorId,
      oldValue: { expiresAt: subcontractor.accessExpiresAt },
      newValue: { expiresAt: newExpiry }
    });

    return updated;
  }

  /**
   * Révoque les accès expirés (Lancé par Cron)
   */
  static async revokeExpiredAccess() {
    const now = new Date();
    const expiredUsers = await prisma.user.findMany({
      where: {
        role: 'SOUS_TRAITANT',
        accessExpiresAt: { lt: now },
        deletedAt: null // On ne révoque que ceux qui ne le sont pas déjà
      }
    });

    // On pourrait simplement laisser le middleware bloquer, 
    // ou on peut marquer le compte comme inactif/supprimé si besoin.
    // Ici, le middleware suffit, mais on logue pour la traçabilité.
    for (const user of expiredUsers) {
      console.log(`🚫 Accès révoqué automatiquement pour : ${user.email}`);
    }

    return expiredUsers.length;
  }
}
