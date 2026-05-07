import PDFDocument from 'pdfkit';
import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { QuoteService } from './quote.service';
import path from 'path';
import fs from 'fs';

export class PDFService {
  /**
   * Génère le PDF d'un devis et le stocke localement
   */
  static async generateQuote(quoteId: string): Promise<string> {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: { include: { service: true } },
        client: true,
        mandat: true
      }
    });

    if (!quote) throw new ValidationError('Devis non trouvé');

    // Répertoire de stockage des PDFs
    const pdfDir = path.resolve(process.cwd(), 'storage', 'quotes');
    fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `${quote.reference}.pdf`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // ─── EN-TÊTE ───────────────────────────────────────
      doc
        .fontSize(22)
        .fillColor('#1a1a2e')
        .text('DIGITALDETECTIVES', 50, 50, { align: 'left' })
        .fontSize(9)
        .fillColor('#666')
        .text('Agence d\'investigation privée', 50, 75)
        .text('Suisse — Confidentiel', 50, 87);

      // Informations du devis (coin droit)
      doc
        .fontSize(10)
        .fillColor('#1a1a2e')
        .text(`Devis N° ${quote.reference}`, 350, 50, { align: 'right' })
        .fontSize(9)
        .fillColor('#666')
        .text(`Date : ${quote.createdAt.toLocaleDateString('fr-CH')}`, 350, 65, { align: 'right' });

      if (quote.expiresAt) {
        doc.text(`Valable jusqu'au : ${quote.expiresAt.toLocaleDateString('fr-CH')}`, 350, 78, { align: 'right' });
      }

      // Ligne de séparation
      doc
        .moveTo(50, 110)
        .lineTo(545, 110)
        .strokeColor('#e0e0e0')
        .stroke();

      // ─── CLIENT ────────────────────────────────────────
      doc
        .fontSize(11)
        .fillColor('#1a1a2e')
        .text('Destinataire :', 50, 125)
        .fontSize(10)
        .fillColor('#333')
        .text(`${quote.client.firstName} ${quote.client.lastName}`, 50, 140);

      if (quote.client.company) {
        doc.text(quote.client.company, 50, 153);
      }
      if (quote.client.email) {
        doc.text(quote.client.email, 50, 166);
      }

      // Référence mandat
      doc
        .fontSize(10)
        .fillColor('#1a1a2e')
        .text(`Mandat : ${quote.mandat.title}`, 300, 125, { align: 'right' });

      // ─── TABLEAU DES PRESTATIONS ───────────────────────
      const tableTop = 200;

      // En-tête du tableau
      doc
        .rect(50, tableTop, 495, 22)
        .fillColor('#1a1a2e')
        .fill();

      doc
        .fontSize(9)
        .fillColor('#fff')
        .text('Prestation', 55, tableTop + 6)
        .text('Qté', 320, tableTop + 6, { width: 40, align: 'center' })
        .text('Prix unit.', 365, tableTop + 6, { width: 60, align: 'right' })
        .text('Remise', 430, tableTop + 6, { width: 40, align: 'center' })
        .text('Total HT', 475, tableTop + 6, { width: 70, align: 'right' });

      // Lignes du tableau
      let y = tableTop + 25;
      doc.fillColor('#333').fontSize(9);

      for (const [index, item] of quote.items.entries()) {
        const bgColor = index % 2 === 0 ? '#f9f9f9' : '#fff';
        doc.rect(50, y - 3, 495, 18).fillColor(bgColor).fill();

        doc
          .fillColor('#333')
          .text(item.label, 55, y, { width: 260 })
          .text(String(item.quantity), 320, y, { width: 40, align: 'center' })
          .text(`${item.unitPrice.toFixed(2)} CHF`, 365, y, { width: 60, align: 'right' })
          .text(item.discount > 0 ? `${item.discount}%` : '-', 430, y, { width: 40, align: 'center' })
          .text(`${item.totalHT.toFixed(2)} CHF`, 475, y, { width: 70, align: 'right' });

        y += 18;
      }

      // Ligne de séparation sous le tableau
      doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#e0e0e0').stroke();

      // ─── TOTAUX ────────────────────────────────────────
      y += 15;

      doc
        .fontSize(10)
        .fillColor('#666')
        .text('Total HT :', 380, y, { width: 80, align: 'right' })
        .fillColor('#333')
        .text(`${quote.totalHT.toFixed(2)} CHF`, 465, y, { width: 80, align: 'right' });

      y += 18;
      doc
        .fillColor('#666')
        .text(`TVA (${quote.taxRate}%) :`, 380, y, { width: 80, align: 'right' })
        .fillColor('#333')
        .text(`${(quote.totalTTC - quote.totalHT).toFixed(2)} CHF`, 465, y, { width: 80, align: 'right' });

      y += 22;
      doc
        .rect(370, y - 5, 175, 24)
        .fillColor('#1a1a2e')
        .fill();

      doc
        .fontSize(12)
        .fillColor('#fff')
        .text('Total TTC :', 380, y, { width: 80, align: 'right' })
        .text(`${quote.totalTTC.toFixed(2)} CHF`, 465, y, { width: 80, align: 'right' });

      // ─── NOTES / CGV ───────────────────────────────────
      if (quote.notes) {
        y += 50;
        doc
          .fontSize(9)
          .fillColor('#1a1a2e')
          .text('Notes & Conditions :', 50, y)
          .moveDown(0.3)
          .fillColor('#666')
          .text(quote.notes, 50, y + 15, { width: 495 });
      }

      // ─── PIED DE PAGE ──────────────────────────────────
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(
          'Digitaldetectives — Ce document est confidentiel et destiné uniquement au destinataire ci-dessus.',
          50,
          770,
          { align: 'center', width: 495 }
        );

      doc.end();

      stream.on('finish', async () => {
        // Sauvegarder le chemin en base
        await QuoteService.savePdfPath(quoteId, pdfPath);
        resolve(pdfPath);
      });

      stream.on('error', reject);
    });
  }
}
