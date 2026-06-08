import { api } from './base';

export class BillingApi {
  /**
   * Génère un lien de paiement Stripe pour une facture donnée
   */
  static async createPaymentLink(invoiceId: string): Promise<{ url: string }> {
    const response = await api.post(`/billing/invoices/${invoiceId}/pay`);
    return response.data;
  }

  /**
   * Simule un webhook Stripe réussi pour tester localement
   */
  static async simulateStripeWebhook(invoiceId: string): Promise<any> {
    const response = await api.post(
      `/webhooks/stripe`,
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: invoiceId
          }
        }
      },
      {
        headers: {
          'x-mock-webhook': 'true'
        }
      }
    );
    return response.data;
  }

  /**
   * Génère un lien de paiement Stripe ET l'envoie par email au client
   */
  static async sendPaymentLinkToClient(invoiceId: string): Promise<{ message: string; url: string; emailSent: boolean }> {
    const response = await api.post(`/billing/invoices/${invoiceId}/send-to-client`);
    return response.data;
  }

  /**
   * Liste les factures avec filtres optionnels
   */
  static async listInvoices(params?: { clientId?: string; mandatId?: string }): Promise<any[]> {
    const response = await api.get('/billing/invoices', { params });
    return response.data;
  }
}
