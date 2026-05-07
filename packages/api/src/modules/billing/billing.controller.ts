import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { BillingService } from './billing.service';

export class BillingController {
  static async getSummary(req: AuthRequest, res: Response) {
    const summary = await BillingService.computeSubcontractorInvoice(
      req.params.subcontractorId,
      req.query.mandatId as string
    );
    res.json(summary);
  }

  static async downloadPDF(req: AuthRequest, res: Response) {
    const pdfBuffer = await BillingService.generateInvoicePDF(
      req.params.subcontractorId,
      req.query.mandatId as string
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture_interne_${req.params.subcontractorId}.pdf`);
    res.send(pdfBuffer);
  }

  static async markAsInvoiced(req: AuthRequest, res: Response) {
    const count = await BillingService.markAsInvoiced(req.body.timeEntryIds, req.user!.userId);
    res.json({ message: `${count} heures marquées comme facturées` });
  }
}
