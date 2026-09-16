import Stripe from 'stripe';
import { prisma } from '../../shared/prisma';

// Initialisation de Stripe (utiliser une clé de test par défaut si non définie)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_12345', {
  apiVersion: '2026-05-27.dahlia', // Utiliser la version la plus récente supportée
});

export class StripeService {
  /**
   * Crée une session Checkout Stripe pour une facture donnée
   */
  static async createCheckoutSession(invoiceId: string) {
    let activeInvoiceId = invoiceId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Seeding automatique si ID temporaire de simulation de test
    if (invoiceId === 'TEST_INVOICE_ID') {
      let client = await prisma.client.findFirst({
        where: { email: 'wilfried-client-test@example.com' }
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            firstName: 'Wilfried',
            lastName: 'Test',
            email: 'wilfried-client-test@example.com',
            phone: '+33612345678',
            status: 'ACTIF'
          }
        });
      }

      let mandat = await prisma.mandat.findFirst({
        where: { title: 'Mandat de Test WhatsApp 1779527565547' }
      });
      if (!mandat) {
        mandat = await prisma.mandat.create({
          data: {
            title: 'Mandat de Test WhatsApp 1779527565547',
            description: 'Enquête de test Stripe',
            clientId: client.id,
            status: 'OUVERT'
          }
        });
      }

      const invoice = await prisma.invoice.create({
        data: {
          amount: 150.00,
          status: 'PENDING',
          mandatId: mandat.id
        }
      });
      activeInvoiceId = invoice.id;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: activeInvoiceId },
      include: {
        quote: { include: { client: true } },
        mandat: { include: { client: true } }
      }
    });

    if (!invoice) throw new Error('Facture introuvable');
    
    const client = invoice.quote?.client || invoice.mandat.client;
    const clientEmail = client?.email;

    // Simulation si aucune clé Stripe configurée (placeholders détectés)
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const hasStripeKey = stripeKey.length > 20 && !stripeKey.includes('...');
    if (!hasStripeKey) {
      const mockSessionId = `cs_test_${Date.now()}`;
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { stripeSessionId: mockSessionId }
      });
      // Redirige vers le mandat avec des paramètres de démo supplémentaires pour simuler le webhook
      return { 
        url: `${frontendUrl}/settings/stripe?payment=success&mock_session=${mockSessionId}&invoice_id=${invoice.id}` 
      };
    }

    // Créer la session Stripe réelle
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: clientEmail,
      client_reference_id: invoice.id,
      metadata: {
        invoiceId: invoice.id,
        mandatId: invoice.mandatId,
        quoteId: invoice.quoteId || '',
      },
      line_items: [
        {
          price_data: {
            currency: 'chf',
            product_data: {
              name: `Paiement - ${invoice.quote?.reference || invoice.mandat.title}`,
              description: `Facture pour le mandat ${invoice.mandat.title}`,
            },
            unit_amount: Math.round(invoice.amount * 100), // En centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/settings/stripe?payment=success&invoice_id=${invoice.id}`,
      cancel_url: `${frontendUrl}/settings/stripe?payment=cancel`,
    });

    // Mettre à jour la facture avec l'ID de session
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: session.id }
    });

    return { url: session.url };
  }

  /**
   * Vérifie la signature du webhook
   */
  static verifyWebhookSignature(payload: Buffer, signature: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
    try {
      return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }
  }
}
