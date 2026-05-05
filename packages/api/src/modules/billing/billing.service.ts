import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';
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
}
