import { InvoiceStatus } from '@prisma/client';
import { prisma } from '../../../shared/prisma';
import { buildQrReference } from '../qr-reference';
import {
  BankDataProvider,
  FetchTransactionsParams,
  NormalizedBankAccount,
  NormalizedBankTransaction,
} from '../banking.types';

/**
 * Connecteur de démonstration : fabrique un relevé plausible à partir des
 * factures réellement en attente dans le CRM.
 *
 * Il sert à dérouler et à démontrer la chaîne complète (import → rapprochement
 * → file d'attente) sans dépendre du contrat bLink ni d'un export bancaire.
 * Les écritures produites sont volontairement hétérogènes : référence QR
 * structurée, référence recopiée dans la communication, nom seul, et bruit
 * (frais bancaires, virement inconnu).
 */
export class MockProvider implements BankDataProvider {
  readonly name = 'MOCK';

  isConfigured(): boolean {
    return true;
  }

  async listAccounts(): Promise<NormalizedBankAccount[]> {
    return [
      {
        iban: process.env.BANK_MOCK_IBAN || 'CH5604835012345678009',
        label: 'UBS – Compte courant CHF (démonstration)',
        currency: 'CHF',
      },
    ];
  }

  async fetchTransactions(params: FetchTransactionsParams): Promise<NormalizedBankTransaction[]> {
    const invoices = await prisma.invoice.findMany({
      where: { status: InvoiceStatus.PENDING },
      include: {
        quote: { select: { reference: true } },
        mandat: { include: { client: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const bookingDate = new Date(Math.min(Date.now(), params.dateTo.getTime()));
    const transactions: NormalizedBankTransaction[] = [];

    invoices.forEach((invoice, index) => {
      const client = invoice.mandat.client;
      const clientName = client.company || `${client.firstName} ${client.lastName}`;
      const quoteReference = invoice.quote?.reference;
      const qrReference = invoice.paymentReference || buildQrReference(invoice.id.replace(/\D/g, '') || `${index}`);

      const base = {
        externalId: `MOCK-${invoice.id.slice(0, 12)}`,
        bookingDate,
        valueDate: bookingDate,
        amount: invoice.amount,
        currency: 'CHF',
        creditDebit: 'CRDT' as const,
        debtorName: clientName,
        debtorIban: 'CH9300762011623852957',
      };

      switch (index % 4) {
        // Paiement QR : la banque restitue la référence structurée
        case 0:
          transactions.push({ ...base, structuredRef: qrReference, remittanceInfo: 'Paiement QR-facture' });
          break;
        // Virement e-banking avec la référence du devis dans la communication
        case 1:
          transactions.push({
            ...base,
            remittanceInfo: `Paiement facture ${quoteReference ?? invoice.id.slice(0, 8).toUpperCase()}`,
            endToEndId: quoteReference ?? undefined,
          });
          break;
        // Virement sans référence : seuls le nom et le montant permettent d'identifier
        case 2:
          transactions.push({ ...base, remittanceInfo: 'Virement' });
          break;
        // Cas dégradé : nom tronqué par la banque, aucune communication
        default:
          transactions.push({ ...base, debtorName: clientName.slice(0, 8).toUpperCase(), remittanceInfo: undefined });
      }
    });

    // Bruit réaliste : ces écritures doivent atterrir en vérification manuelle
    transactions.push(
      {
        externalId: 'MOCK-FEES',
        bookingDate,
        valueDate: bookingDate,
        amount: 12.5,
        currency: 'CHF',
        creditDebit: 'DBIT',
        remittanceInfo: 'Frais de tenue de compte',
      },
      {
        externalId: 'MOCK-UNKNOWN',
        bookingDate,
        valueDate: bookingDate,
        amount: 480,
        currency: 'CHF',
        creditDebit: 'CRDT',
        remittanceInfo: 'Remboursement note de frais',
        debtorName: 'Fiduciaire Lemanique SA',
      },
    );

    return transactions;
  }
}
