import nodemailer from 'nodemailer';
import { ValidationError } from '../../shared/errors';
import { prisma } from '../../shared/prisma';

export class MailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Utile pour certains serveurs mail
    }
  });

  /**
   * Envoie un email simple avec BCC automatique vers la boîte Digitaldetectives
   * et enregistre l'email envoyé dans la table Email (direction OUTBOUND)
   */
  static async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      path?: string;
      content?: Buffer;
      contentType?: string;
    }>;
    // Paramètres optionnels pour l'association client/mandat et le threading
    clientId?: string;
    mandatId?: string;
    inReplyTo?: string;
    references?: string;
  }) {
    try {
      // Construire les headers de threading si c'est une réponse
      const headers: Record<string, string> = {};
      if (options.inReplyTo) {
        headers['In-Reply-To'] = options.inReplyTo;
      }
      if (options.references) {
        headers.References = options.references;
      }

      const info = await this.transporter.sendMail({
        from: `Digitaldetectives <${process.env.SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        // BCC automatique vers la boîte Digitaldetectives pour synchro bidirectionnelle
        bcc: process.env.SMTP_USER,
        headers,
      });

      console.log(`✅ Email envoyé : ${info.messageId}`);

      // Enregistrer l'email envoyé en base de données (direction OUTBOUND)
      try {
        // Calculer le threadId : si c'est une réponse, chercher le thread existant
        let threadId: string | null = null;
        if (options.inReplyTo) {
          const parentEmail = await prisma.email.findUnique({
            where: { messageId: options.inReplyTo }
          });
          threadId = parentEmail?.threadId || parentEmail?.messageId || options.inReplyTo;
        }

        await prisma.email.create({
          data: {
            messageId: info.messageId,
            from: `Digitaldetectives <${process.env.SMTP_FROM}>`,
            to: options.to,
            subject: options.subject,
            body: options.html || options.text || '',
            direction: 'OUTBOUND',
            receivedAt: new Date(),
            threadId,
            inReplyTo: options.inReplyTo || null,
            references: options.references || null,
            clientId: options.clientId || null,
            mandatId: options.mandatId || null,
          }
        });
        console.log(`💾 Email sortant enregistré en base : ${info.messageId}`);
      } catch (dbErr) {
        // Ne pas bloquer l'envoi si l'enregistrement en base échoue
        console.error('⚠️ Erreur lors de l\'enregistrement de l\'email sortant en base :', dbErr);
      }

      return info;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'envoi de l\'email :', error);
      throw new ValidationError(`Échec de l'envoi de l'email : ${error.message}`);
    }
  }

  /**
   * Envoie un devis par email
   */
  static async sendQuote(to: string, clientName: string, quoteRef: string, pdfPath: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #1a1a2e;">Bonjour ${clientName},</h2>
        <p>Veuillez trouver ci-joint votre devis <strong>${quoteRef}</strong> établi par l'agence Digitaldetectives.</p>
        <p>Ce document est valable 30 jours. N'hésitez pas à nous contacter si vous avez des questions.</p>
        <br/>
        <p>Cordialement,</p>
        <p><strong>L'équipe Digitaldetectives</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Ceci est un message automatique, merci de ne pas y répondre directement.</p>
      </div>
    `;

    return this.sendMail({
      to,
      subject: `Devis Digitaldetectives - ${quoteRef}`,
      html,
      attachments: [
        {
          filename: `${quoteRef}.pdf`,
          path: pdfPath,
        },
      ],
    });
  }
}
