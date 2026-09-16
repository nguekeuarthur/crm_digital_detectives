import { prisma } from '../../shared/prisma';
import { InvoiceStatus } from '@prisma/client';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { StripeService } from './stripe.service';
import PDFDocument from 'pdfkit';

export class BillingService {
  /**
   * Calcule le résumé de facturation pour un sous-traitant sur un mandat
   */
  static async computeSubcontractorInvoice(subcontractorId: string, mandatId: string) {
    // 1. Récupérer l'affectation pour avoir le taux horaire
    const assignment = await prisma.mandatSubcontractor.findUnique({
      where: { mandatId_subcontractorId: { mandatId, subcontractorId } },
      include: {
        subcontractor: { select: { firstName: true, lastName: true, email: true } },
        mandat: { select: { title: true } }
      }
    });

    if (!assignment) {
      throw new ValidationError('Sous-traitant non affecté à ce mandat');
    }

    // 2. Récupérer les heures validées ET non facturées
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        subcontractorId,
        mandatId,
        validated: true,
        invoiced: false
      },
      orderBy: { date: 'asc' }
    });

    // 3. Calculs
    let totalHours = 0;
    const details = timeEntries.map(entry => {
      totalHours += entry.hours;
      return {
        id: entry.id,
        date: entry.date,
        hours: entry.hours,
        description: entry.description,
        amount: entry.hours * assignment.hourlyRate
      };
    });

    const totalAmount = totalHours * assignment.hourlyRate;

    return {
      subcontractor: assignment.subcontractor,
      mandat: assignment.mandat,
      hourlyRate: assignment.hourlyRate,
      totalHours,
      totalAmount,
      details,
      timeEntryIds: timeEntries.map(e => e.id)
    };
  }

  /**
   * Génère le PDF de récapitulatif
   */
  static async generateInvoicePDF(subcontractorId: string, mandatId: string): Promise<Buffer> {
    const summary = await this.computeSubcontractorInvoice(subcontractorId, mandatId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text('Récapitulatif de Facturation (Usage Interne)', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Sous-traitant : ${summary.subcontractor.firstName} ${summary.subcontractor.lastName}`);
      doc.text(`Mandat : ${summary.mandat.title}`);
      doc.text(`Taux Horaire : ${summary.hourlyRate} €/h`);
      doc.moveDown(2);

      // Tableau des heures
      doc.fontSize(14).text('Détail des heures validées :', { underline: true });
      doc.moveDown();

      doc.fontSize(10);
      summary.details.forEach(detail => {
        const dateStr = detail.date.toLocaleDateString('fr-FR');
        doc.text(`${dateStr} | ${detail.hours}h | ${detail.amount} € | ${detail.description || 'Sans description'}`);
      });

      doc.moveDown(2);
      
      // Total
      doc.fontSize(16).text(`TOTAL HEURES : ${summary.totalHours}h`, { align: 'right' });
      doc.fontSize(16).text(`TOTAL À PAYER : ${summary.totalAmount} €`, { align: 'right' });

      doc.end();
    });
  }

  /**
   * Marque les heures comme facturées/payées
   */
  static async markAsInvoiced(timeEntryIds: string[], adminId: string) {
    if (!timeEntryIds || timeEntryIds.length === 0) return 0;

    const result = await prisma.timeEntry.updateMany({
      where: { id: { in: timeEntryIds } },
      data: { invoiced: true }
    });

    await AuditService.log({
      userId: adminId,
      action: 'MARK_AS_INVOICED',
      entity: 'TimeEntry',
      newValue: { count: result.count, timeEntryIds }
    });

    return result.count;
  }

  /**
   * Marque une facture client comme payée (Stripe) et génère le PDF final.
   * Envoie automatiquement le reçu PDF par email au client.
   */
  static async markInvoiceAsPaid(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        mandat: { include: { client: true } },
        quote: true
      }
    });

    if (!invoice) throw new Error('Facture introuvable');
    if (invoice.status === InvoiceStatus.PAID) return invoice; // Déjà payée

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: InvoiceStatus.PAID,
        paymentDate: new Date()
      }
    });

    // Générer la facture PDF acquittée
    const pdfBuffer = await this.generateClientInvoicePDF(invoice);

    // Envoyer le reçu PDF par email au client
    const client = invoice.mandat.client;
    const clientName = `${client.firstName} ${client.lastName}`;
    const reference = invoice.quote?.reference || `FACTURE-${invoice.id.substring(0,8).toUpperCase()}`;

    try {
      await MailService.sendMail({
        to: client.email,
        subject: `Confirmation de paiement – ${reference} | Digitaldetectives`,
        html: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${clientName},</h2>
    <p>Nous vous confirmons la bonne réception de votre paiement pour le mandat <strong>«&nbsp;${invoice.mandat.title}&nbsp;»</strong>.</p>
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #166534;">✅ Paiement confirmé</p>
      <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #166534;">${invoice.amount.toFixed(2)} CHF</p>
    </div>
    <p>Vous trouverez votre facture acquittée en pièce jointe de cet e-mail.</p>
    <p>Référence : <strong>${reference}</strong></p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
        attachments: [
          {
            filename: `Facture_${reference}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ],
        clientId: client.id,
        mandatId: invoice.mandatId
      });
      console.log(`✅ Reçu de paiement envoyé par email à ${client.email}`);
    } catch (emailErr) {
      console.error('⚠️ Erreur lors de l\'envoi du reçu par email:', emailErr);
      // Ne pas bloquer le processus si l'email échoue
    }

    return updatedInvoice;
  }

  /**
   * Marque une facture client comme payée manuellement (Virement, chèque, etc.)
   */
  static async markAsPaidManual(invoiceId: string, paymentDate: Date, bankReference: string, adminId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { mandat: true }
    });

    if (!invoice) throw new Error('Facture introuvable');
    if (invoice.status === InvoiceStatus.PAID) throw new Error('Facture déjà payée');

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: InvoiceStatus.PAID,
        paymentDate,
        bankReference
      }
    });

    await AuditService.log({
      userId: adminId,
      action: 'MARK_INVOICE_PAID_MANUAL',
      entity: 'Invoice',
      entityId: invoiceId,
      newValue: { paymentDate, bankReference }
    });

    return updatedInvoice;
  }

  /**
   * Génère un lien de paiement Stripe et l'envoie par email au client.
   * C'est la méthode principale appelée depuis le CRM pour facturer un client.
   */
  static async sendPaymentLinkToClient(invoiceId: string) {
    // Générer le lien de paiement Stripe
    const { url } = await StripeService.createCheckoutSession(invoiceId);

    // Récupérer les infos de la facture avec le client
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        mandat: { include: { client: true } },
        quote: true
      }
    });

    if (!invoice) throw new Error('Facture introuvable');

    const client = invoice.mandat.client;
    const clientName = `${client.firstName} ${client.lastName}`;
    const reference = invoice.quote?.reference || `FACTURE-${invoice.id.substring(0,8).toUpperCase()}`;

    // Envoyer l'email avec le lien de paiement
    await MailService.sendMail({
      to: client.email,
      subject: `Votre facture ${reference} – Paiement en ligne | Digitaldetectives`,
      html: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${clientName},</h2>
    <p>Veuillez trouver ci-dessous le récapitulatif de votre facture :</p>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Référence</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${reference}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Mandat</td>
          <td style="padding: 8px 0; text-align: right;">${invoice.mandat.title}</td>
        </tr>
        <tr style="border-top: 2px solid #dee2e6;">
          <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Montant total</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #1a1a2e;">${invoice.amount.toFixed(2)} CHF</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #635bff 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">💳 Payer maintenant</a>
    </div>
    <p style="font-size: 13px; color: #666; text-align: center;">Vous serez redirigé vers la plateforme sécurisée Stripe pour effectuer le paiement par carte bancaire.</p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
      clientId: client.id,
      mandatId: invoice.mandatId,
      attachments: [
        {
          filename: `${reference}.pdf`,
          content: await this.generateClientInvoicePDF(invoice, false),
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`📧 Lien de paiement envoyé à ${client.email} pour la facture ${reference}`);
    return { url, emailSent: true };
  }

  /**
   * Génère la facture officielle pour un client
   */
  static async generateClientInvoicePDF(invoice: any, isPaid: boolean = true): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const clientName = `${invoice.mandat.client.firstName} ${invoice.mandat.client.lastName}`;
      const reference = invoice.quote?.reference || `FACTURE-${invoice.id.substring(0,8).toUpperCase()}`;

      doc.fontSize(24)
         .fillColor(isPaid ? '#2f9e44' : '#1a1a2e')
         .text(isPaid ? 'FACTURE ACQUITTÉE' : 'FACTURE', { align: 'right' });
      doc.moveDown();

      doc.fillColor('#333').fontSize(12).text(`Client : ${clientName}`);
      doc.text(`Mandat : ${invoice.mandat.title}`);
      doc.text(`Référence : ${reference}`);
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`);
      if (invoice.dueDate && !isPaid) {
        doc.text(`Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`);
      }
      doc.moveDown(2);

      doc.text(isPaid ? 'Montant total payé :' : 'Montant total à régler :', { underline: true });
      doc.fontSize(16)
         .fillColor(isPaid ? '#2f9e44' : '#e03131')
         .text(`${invoice.amount.toFixed(2)} CHF`);
      
      doc.moveDown(4);
      doc.fontSize(10).text('Merci pour votre confiance.', { align: 'center' });

      doc.end();
    });
  }
}
