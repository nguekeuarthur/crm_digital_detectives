import { BankTransaction, BankTxStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { AuditService } from '../audit/audit.service';
import { BillingService } from '../billing/billing.service';
import { normalizeReference } from './qr-reference';
import { containsReference, nameSimilarity } from './text-matching';

/**
 * Moteur de rapprochement bancaire.
 *
 * Chaque virement reçu est confronté aux factures en attente. Le score combine
 * trois signaux, du plus fiable au plus faible :
 *   1. la référence structurée QR/ISR restituée par la banque (quasi certaine) ;
 *   2. une référence CRM recopiée dans la communication du payeur ;
 *   3. le couple montant + nom du donneur d'ordre (tolérant aux libellés bruités).
 *
 * Au-dessus du seuil d'auto-rapprochement ET si aucun autre candidat n'est
 * proche, la facture est soldée automatiquement. Sinon l'écriture part en file
 * d'attente de vérification manuelle, avec ses candidats pré-classés.
 */

export type MatchMethod =
  | 'QR_REFERENCE'
  | 'REFERENCE_IN_TEXT'
  | 'INVOICE_ID'
  | 'MANDATE_ID'
  | 'AMOUNT_AND_NAME'
  | 'AMOUNT_ONLY'
  | 'MANUAL';

/** Score minimal pour solder une facture sans intervention humaine */
export const AUTO_MATCH_THRESHOLD = Number(process.env.BANK_AUTO_MATCH_THRESHOLD || 0.9);
/** Score minimal pour proposer un candidat à l'opérateur */
export const SUGGEST_THRESHOLD = Number(process.env.BANK_SUGGEST_THRESHOLD || 0.5);
/** Écart minimal avec le second candidat pour considérer le rapprochement non ambigu */
export const AMBIGUITY_MARGIN = Number(process.env.BANK_AMBIGUITY_MARGIN || 0.15);
/** Envoi automatique du reçu au client lors d'un rapprochement automatique */
const SEND_RECEIPT_ON_AUTO_MATCH = process.env.BANK_SEND_RECEIPT_ON_AUTO_MATCH !== 'false';

export interface MatchCandidate {
  invoiceId: string;
  score: number;
  method: MatchMethod;
  reasons: string[];
  invoiceLabel: string;
  invoiceAmount: number;
  clientName: string;
}

export type CandidateInvoice = Prisma.InvoiceGetPayload<{
  include: {
    quote: { select: { reference: true } };
    mandat: { include: { client: true } };
  };
}>;

/** Motifs de référence propres au CRM, utilisés pour mesurer le taux sur paiements référencés */
const CRM_REFERENCE_PATTERNS = [
  /DD-\d{4}-\d{4}/i, // Référence de devis (ex: DD-2026-0001)
  /FAC-[A-Z0-9]{6,}/i, // Référence de facture
  /\d{26,27}/, // Référence QR / ISR
  /RF\d{2}[0-9A-Z]{1,21}/i, // Référence créancier SCOR
];

export class ReconciliationService {
  /** L'écriture porte-t-elle une référence exploitable (QR ou référence CRM saisie) ? */
  static carriesCrmReference(transaction: {
    structuredRef?: string | null;
    remittanceInfo?: string | null;
    endToEndId?: string | null;
  }): boolean {
    if (transaction.structuredRef) return true;
    const haystack = `${transaction.remittanceInfo ?? ''} ${transaction.endToEndId ?? ''}`;
    return CRM_REFERENCE_PATTERNS.some((pattern) => pattern.test(haystack));
  }

  /**
   * Note une facture candidate face à une écriture bancaire.
   * Retourne null si aucun signal exploitable.
   */
  static scoreInvoice(transaction: BankTransaction, invoice: CandidateInvoice): MatchCandidate | null {
    const haystack = [transaction.structuredRef, transaction.remittanceInfo, transaction.endToEndId]
      .filter(Boolean)
      .join(' ');

    const client = invoice.mandat.client;
    const clientName = client.company || `${client.firstName} ${client.lastName}`;
    const reasons: string[] = [];

    const amountDiff = Math.abs(transaction.amount - invoice.amount);
    const amountExact = amountDiff < 0.01;
    const amountClose = amountDiff <= Math.max(1, invoice.amount * 0.01);
    const amountScore = amountExact ? 1 : amountClose ? 0.6 : 0;

    if (amountExact) reasons.push('Montant identique');
    else if (amountClose) reasons.push(`Montant proche (écart ${amountDiff.toFixed(2)} CHF)`);

    let score: number;
    let method: MatchMethod;
    let referenceMatched = true;

    const quoteReference = invoice.quote?.reference ?? null;
    const invoiceShortId = invoice.id.slice(0, 8);

    if (
      invoice.paymentReference &&
      transaction.structuredRef &&
      normalizeReference(transaction.structuredRef) === normalizeReference(invoice.paymentReference)
    ) {
      score = 1;
      method = 'QR_REFERENCE';
      reasons.unshift('Référence QR structurée identique');
    } else if (invoice.paymentReference && containsReference(haystack, invoice.paymentReference)) {
      score = 0.95;
      method = 'REFERENCE_IN_TEXT';
      reasons.unshift('Référence de paiement citée dans la communication');
    } else if (quoteReference && containsReference(haystack, quoteReference)) {
      score = 0.93;
      method = 'REFERENCE_IN_TEXT';
      reasons.unshift(`Référence de devis ${quoteReference} citée dans la communication`);
    } else if (
      // Un identifiant purement numérique pourrait apparaître par hasard dans une
      // référence QR : on ne l'accepte alors que préfixé par "FAC".
      containsReference(haystack, `FAC${invoiceShortId}`) ||
      (/[a-z]/i.test(invoiceShortId) && containsReference(haystack, invoiceShortId))
    ) {
      score = 0.9;
      method = 'INVOICE_ID';
      reasons.unshift('Numéro de facture cité dans la communication');
    } else if (containsReference(haystack, invoice.mandatId)) {
      score = 0.87;
      method = 'MANDATE_ID';
      reasons.unshift('Identifiant de mandat cité dans la communication');
    } else {
      referenceMatched = false;

      const nameScore = Math.max(
        nameSimilarity(transaction.debtorName, clientName),
        nameSimilarity(transaction.debtorName, `${client.firstName} ${client.lastName}`),
        nameSimilarity(transaction.remittanceInfo, clientName),
      );

      // Sans référence, il faut au minimum un signal de montant crédible
      if (amountScore === 0) return null;
      if (nameScore < 0.4 && !amountExact) return null;

      score = amountScore * 0.55 + nameScore * 0.45;
      method = nameScore >= 0.6 ? 'AMOUNT_AND_NAME' : 'AMOUNT_ONLY';

      if (nameScore >= 0.6) {
        reasons.push(`Donneur d'ordre proche de « ${clientName} » (${Math.round(nameScore * 100)} %)`);
      } else {
        reasons.push("Aucun nom de donneur d'ordre exploitable");
      }
    }

    // Une référence juste avec un montant différent = paiement partiel probable :
    // on ne solde jamais automatiquement, on propose à l'opérateur.
    if (referenceMatched && !amountExact) {
      score = Math.min(score, 0.75);
      reasons.push('Montant différent de la facture : validation manuelle requise');
    }

    if (transaction.currency !== 'CHF' && transaction.currency) {
      score = Math.min(score, 0.6);
      reasons.push(`Devise ${transaction.currency} à vérifier`);
    }

    return {
      invoiceId: invoice.id,
      score: Number(score.toFixed(4)),
      method,
      reasons,
      invoiceLabel: quoteReference ?? `FAC-${invoiceShortId.toUpperCase()}`,
      invoiceAmount: invoice.amount,
      clientName,
    };
  }

  /** Factures susceptibles d'être soldées par un virement */
  private static async loadPendingInvoices(): Promise<CandidateInvoice[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    return prisma.invoice.findMany({
      where: { status: InvoiceStatus.PENDING, createdAt: { gte: twelveMonthsAgo } },
      include: {
        quote: { select: { reference: true } },
        mandat: { include: { client: true } },
      },
    });
  }

  /** Classe les candidats d'une écriture (5 meilleurs) */
  static rankCandidates(transaction: BankTransaction, invoices: CandidateInvoice[]): MatchCandidate[] {
    return invoices
      .map((invoice) => this.scoreInvoice(transaction, invoice))
      .filter((candidate): candidate is MatchCandidate => candidate !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Solde une facture à partir d'une écriture bancaire.
   * Le reçu client n'est envoyé qu'en cas de rapprochement automatique validé
   * (même comportement qu'un encaissement Stripe).
   */
  static async applyMatch(
    transaction: BankTransaction,
    candidate: Pick<MatchCandidate, 'invoiceId' | 'score' | 'method'>,
    options: { userId?: string | null; sendReceipt?: boolean } = {},
  ) {
    const { userId = null, sendReceipt = false } = options;
    const bankReference = transaction.structuredRef || transaction.endToEndId || transaction.externalId;
    const paymentDate = transaction.valueDate ?? transaction.bookingDate;

    if (sendReceipt) {
      // Réutilise la chaîne Stripe : passage à PAID + facture acquittée envoyée au client
      await BillingService.markInvoiceAsPaid(candidate.invoiceId);
      await prisma.invoice.update({
        where: { id: candidate.invoiceId },
        data: { paymentDate, bankReference },
      });
    } else {
      await prisma.invoice.update({
        where: { id: candidate.invoiceId },
        data: { status: InvoiceStatus.PAID, paymentDate, bankReference },
      });
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        status: BankTxStatus.MATCHED,
        matchedInvoiceId: candidate.invoiceId,
        matchScore: candidate.score,
        matchMethod: candidate.method,
        matchedAt: new Date(),
        matchedById: userId,
        ignoredReason: null,
      },
    });

    await AuditService.log({
      userId: userId ?? undefined,
      action: userId ? 'BANK_TX_MATCH_MANUAL' : 'BANK_TX_MATCH_AUTO',
      entity: 'BankTransaction',
      entityId: transaction.id,
      newValue: {
        invoiceId: candidate.invoiceId,
        amount: transaction.amount,
        score: candidate.score,
        method: candidate.method,
        bankReference,
      },
    });

    return updated;
  }

  /**
   * Décision de rapprochement, sans effet de bord : c'est le cœur testable du
   * moteur (voir test-bank-reconciliation.ts).
   *
   * Un candidat n'est validé automatiquement que s'il dépasse le seuil ET qu'il
   * devance nettement le second : deux factures au même montant partent en
   * vérification manuelle plutôt que d'être soldées au hasard.
   */
  static decide(
    transaction: BankTransaction,
    invoices: CandidateInvoice[],
  ): {
    outcome: 'auto' | 'suggested' | 'unmatched' | 'ignored';
    candidates: MatchCandidate[];
    winner?: MatchCandidate;
  } {
    // Les débits ne soldent aucune facture client : ils restent informatifs
    if (transaction.creditDebit === 'DBIT') {
      return { outcome: 'ignored', candidates: [] };
    }

    const candidates = this.rankCandidates(transaction, invoices);
    const [winner, runnerUp] = candidates;

    if (!winner) return { outcome: 'unmatched', candidates };

    const unambiguous = !runnerUp || winner.score - runnerUp.score >= AMBIGUITY_MARGIN;

    if (winner.score >= AUTO_MATCH_THRESHOLD && unambiguous) {
      return { outcome: 'auto', candidates, winner };
    }

    return { outcome: winner.score >= SUGGEST_THRESHOLD ? 'suggested' : 'unmatched', candidates, winner };
  }

  /**
   * Rapproche une écriture et persiste le résultat : auto-validation,
   * suggestion ou mise en file d'attente de vérification manuelle.
   */
  static async reconcileTransaction(transaction: BankTransaction, invoices: CandidateInvoice[]) {
    const decision = this.decide(transaction, invoices);

    if (decision.outcome === 'ignored') {
      await prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: { status: BankTxStatus.IGNORED, ignoredReason: 'Écriture au débit' },
      });
      return { outcome: 'ignored' as const, candidates: [] as MatchCandidate[] };
    }

    const { candidates, winner } = decision;

    if (decision.outcome === 'auto' && winner) {
      await this.applyMatch(transaction, winner, { userId: null, sendReceipt: SEND_RECEIPT_ON_AUTO_MATCH });
      return { outcome: 'auto' as const, candidates, matchedInvoiceId: winner.invoiceId };
    }

    const status = decision.outcome === 'suggested' ? BankTxStatus.SUGGESTED : BankTxStatus.UNMATCHED;

    await prisma.bankTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        suggestions: candidates as unknown as Prisma.InputJsonValue,
        matchScore: winner?.score ?? null,
        matchMethod: winner?.method ?? null,
      },
    });

    return { outcome: status === BankTxStatus.SUGGESTED ? ('suggested' as const) : ('unmatched' as const), candidates };
  }

  /**
   * Passe en revue toutes les écritures non encore rapprochées.
   * Les factures soldées en cours d'exécution sortent du vivier pour éviter
   * qu'un second virement ne se rapproche de la même facture.
   */
  static async runReconciliation() {
    const transactions = await prisma.bankTransaction.findMany({
      where: { status: { in: [BankTxStatus.UNMATCHED, BankTxStatus.SUGGESTED] } },
      orderBy: { bookingDate: 'asc' },
    });

    let invoices = await this.loadPendingInvoices();
    const stats = { processed: 0, auto: 0, suggested: 0, unmatched: 0, ignored: 0 };

    for (const transaction of transactions) {
      const result = await this.reconcileTransaction(transaction, invoices);
      stats.processed += 1;

      if (result.outcome === 'auto') {
        stats.auto += 1;
        invoices = invoices.filter((invoice) => invoice.id !== result.matchedInvoiceId);
      } else if (result.outcome === 'suggested') {
        stats.suggested += 1;
      } else if (result.outcome === 'ignored') {
        stats.ignored += 1;
      } else {
        stats.unmatched += 1;
      }
    }

    return stats;
  }
}
