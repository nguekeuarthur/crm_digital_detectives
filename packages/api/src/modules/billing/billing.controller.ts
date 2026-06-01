import { Response, Request } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { prisma } from '../../shared/prisma';

export class BillingController {
  static async getSummary(req: AuthRequest, res: Response) {
    const summary = await BillingService.computeSubcontractorInvoice(
      req.params.subcontractorId as string,
      req.query.mandatId as string
    );
    res.json(summary);
  }

  static async downloadPDF(req: AuthRequest, res: Response) {
    const pdfBuffer = await BillingService.generateInvoicePDF(
      req.params.subcontractorId as string,
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

  static async listInvoices(req: AuthRequest, res: Response) {
    const { clientId, mandatId } = req.query;
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          mandat: {
            clientId: clientId as string || undefined
          },
          mandatId: mandatId as string || undefined
        },
        include: {
          mandat: {
            include: {
              client: true
            }
          },
          quote: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(invoices);
    } catch (error: any) {
      console.error('Error listing invoices:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  }

  // --- STRIPE PAYMENTS ---

  static async createPaymentLink(req: AuthRequest, res: Response) {
    const id = req.params.id as string; // Invoice ID

    try {
      const session = await StripeService.createCheckoutSession(id);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  }

  /**
   * Génère un lien de paiement Stripe ET l'envoie par email au client.
   * C'est l'action principale que l'admin utilise pour facturer un client.
   */
  static async sendPaymentLinkToClient(req: AuthRequest, res: Response) {
    const id = req.params.id as string; // Invoice ID

    try {
      const result = await BillingService.sendPaymentLinkToClient(id);
      res.json({ 
        message: 'Lien de paiement envoyé au client par email',
        url: result.url,
        emailSent: result.emailSent 
      });
    } catch (error: any) {
      console.error('Error sending payment link to client:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  }

  static async downloadInvoicePDF(req: AuthRequest, res: Response) {
    const id = req.params.id as string;
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          mandat: { include: { client: true } },
          quote: true
        }
      });
      if (!invoice) {
        return res.status(404).json({ error: { message: 'Facture introuvable' } });
      }

      const pdfBuffer = await BillingService.generateClientInvoicePDF(invoice);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=facture_${id.substring(0, 8)}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error downloading invoice PDF:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  }

  static async stripeWebhook(req: Request, res: Response) {
    // Note: req.body MUST be a Buffer here (handled by express.raw in routes)
    const isMock = req.headers['x-mock-webhook'] === 'true' && process.env.NODE_ENV === 'development';
    
    let event: any;
    try {
      if (isMock) {
        console.log('[Stripe Webhook] Simulating mock event bypass');
        event = JSON.parse(req.body.toString());
      } else {
        const sigHeaders = req.headers['stripe-signature'];
        const signature = Array.isArray(sigHeaders) ? sigHeaders[0] : sigHeaders || '';
        event = StripeService.verifyWebhookSignature(req.body, signature);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoiceId || session.client_reference_id;

        if (invoiceId) {
          console.log(`[Stripe Webhook] Payment successful for Invoice ${invoiceId}`);
          await BillingService.markInvoiceAsPaid(invoiceId);
        }
      }
      
      res.status(200).send('Webhook handled');
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
