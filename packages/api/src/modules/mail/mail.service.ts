import nodemailer from 'nodemailer';
import { ValidationError } from '../../shared/errors';

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
   * Envoie un email simple
   */
  static async sendMail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      path: string;
    }>;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: `Digitaldetectives <${process.env.SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      console.log(`✅ Email envoyé : ${info.messageId}`);
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
