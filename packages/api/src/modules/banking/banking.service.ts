import { BankProvider, BankTxStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';
import { NormalizedBankTransaction } from './banking.types';
import { getBankProvider, getDefaultProviderKind, CamtFileProvider } from './providers';
import { ReconciliationService } from './reconciliation.service';
import { ensureInvoicePaymentReference } from './payment-reference.service';

/**
 * Orchestration de la connexion bancaire en lecture seule :
 * import des écritures, persistance idempotente, rapprochement, file d'attente.
 */

const DEFAULT_LOOKBACK_DAYS = Number(process.env.BANK_SYNC_LOOKBACK_DAYS || 30);

export class BankingService {
  // ─── Comptes suivis ───────────────────────────────────────────────────────

  static async listAccounts() {
    return prisma.bankAccount.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });
  }

  /** Déclare un compte à suivre (opération purement CRM : rien n'est écrit chez la banque) */
  static async registerAccount(
    data: { iban: string; label: string; currency?: string; provider?: BankProvider; providerAccountId?: string },
    userId?: string,
  ) {
    const iban = data.iban.replace(/\s/g, '').toUpperCase();
    if (!/^CH\d{2}[0-9A-Z]{12,30}$/.test(iban)) {
      throw new ValidationError('IBAN suisse invalide');
    }

    const account = await prisma.bankAccount.upsert({
      where: { iban },
      update: {
        label: data.label,
        currency: data.currency ?? 'CHF',
        provider: data.provider ?? getDefaultProviderKind(),
        providerAccountId: data.providerAccountId,
        isActive: true,
      },
      create: {
        iban,
        label: data.label,
        currency: data.currency ?? 'CHF',
        provider: data.provider ?? getDefaultProviderKind(),
        providerAccountId: data.providerAccountId,
      },
    });

    await AuditService.log({
      userId,
      action: 'BANK_ACCOUNT_REGISTERED',
      entity: 'BankAccount',
      entityId: account.id,
      newValue: { iban, provider: account.provider },
    });

    return account;
  }

  /** Interroge le connecteur pour découvrir les comptes accessibles en lecture */
  static async discoverAccounts(providerKind: BankProvider = getDefaultProviderKind(), userId?: string) {
    const provider = getBankProvider(providerKind);
    const discovered = await provider.listAccounts();
    const accounts = [];

    for (const account of discovered) {
      if (!account.iban) continue;
      accounts.push(
        await this.registerAccount(
          {
            iban: account.iban,
            label: account.label,
            currency: account.currency,
            provider: providerKind,
            providerAccountId: account.providerAccountId,
          },
          userId,
        ),
      );
    }

    return accounts;
  }

  // ─── Import des écritures ─────────────────────────────────────────────────

  /**
   * Insertion idempotente : la contrainte (bankAccountId, externalId) garantit
   * qu'une même écriture importée deux fois n'est jamais dupliquée.
   */
  static async persistTransactions(bankAccountId: string, transactions: NormalizedBankTransaction[]) {
    const rows: Prisma.BankTransactionCreateManyInput[] = transactions
      .filter((transaction) => transaction.externalId && !Number.isNaN(transaction.bookingDate.getTime()))
      .map((transaction) => ({
        bankAccountId,
        externalId: transaction.externalId,
        bookingDate: transaction.bookingDate,
        valueDate: transaction.valueDate,
        amount: transaction.amount,
        currency: transaction.currency || 'CHF',
        creditDebit: transaction.creditDebit,
        remittanceInfo: transaction.remittanceInfo,
        structuredRef: transaction.structuredRef,
        endToEndId: transaction.endToEndId,
        debtorName: transaction.debtorName,
        debtorIban: transaction.debtorIban,
        raw: (transaction.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      }));

    if (!rows.length) return { imported: 0, received: transactions.length };

    const result = await prisma.bankTransaction.createMany({ data: rows, skipDuplicates: true });
    return { imported: result.count, received: transactions.length };
  }

  /** Synchronise un compte sur une période puis relance le rapprochement */
  static async syncAccount(accountId: string, options: { days?: number; userId?: string } = {}) {
    const account = await prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new ValidationError('Compte bancaire introuvable');
    if (!account.isActive) throw new ValidationError('Compte bancaire désactivé');

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (options.days ?? DEFAULT_LOOKBACK_DAYS));

    const provider = getBankProvider(account.provider);

    try {
      const transactions = await provider.fetchTransactions({
        iban: account.iban,
        providerAccountId: account.providerAccountId,
        dateFrom,
        dateTo,
      });

      const { imported, received } = await this.persistTransactions(account.id, transactions);

      await prisma.bankAccount.update({
        where: { id: account.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: `${imported} nouvelle(s) écriture(s) sur ${received} lue(s)`,
        },
      });

      await AuditService.log({
        userId: options.userId,
        action: 'BANK_SYNC',
        entity: 'BankAccount',
        entityId: account.id,
        newValue: { imported, received, provider: account.provider, dateFrom, dateTo },
      });

      return { accountId: account.id, iban: account.iban, imported, received };
    } catch (error) {
      const message = (error as Error).message;
      await prisma.bankAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date(), lastSyncStatus: `Échec : ${message.slice(0, 200)}` },
      });
      throw error;
    }
  }

  /** Synchronise tous les comptes actifs, puis rapproche les écritures importées */
  static async syncAll(options: { days?: number; userId?: string } = {}) {
    const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    const results = [];
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        results.push(await this.syncAccount(account.id, options));
      } catch (error) {
        const message = `${account.iban} : ${(error as Error).message}`;
        console.error('❌ [Banking] Synchronisation en échec —', message);
        errors.push(message);
      }
    }

    const reconciliation = await ReconciliationService.runReconciliation();

    return {
      accounts: results,
      errors,
      imported: results.reduce((sum, result) => sum + result.imported, 0),
      reconciliation,
    };
  }

  /** Import manuel d'un relevé camt.053 téléversé depuis le CRM */
  static async importCamtBuffer(buffer: Buffer, filename: string, userId?: string) {
    const statements = CamtFileProvider.parseBuffer(buffer);
    let imported = 0;
    let received = 0;
    const accountsTouched: string[] = [];

    for (const statement of statements) {
      if (!statement.iban) continue;

      const account = await prisma.bankAccount.upsert({
        where: { iban: statement.iban },
        update: {},
        create: {
          iban: statement.iban,
          label: `Compte ${statement.iban}`,
          currency: statement.currency,
          provider: 'CAMT_FILE',
        },
      });

      const result = await this.persistTransactions(account.id, statement.transactions);
      imported += result.imported;
      received += result.received;
      accountsTouched.push(account.iban);

      await prisma.bankAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date(), lastSyncStatus: `Import manuel de ${filename}` },
      });
    }

    await AuditService.log({
      userId,
      action: 'BANK_CAMT_IMPORT',
      entity: 'BankAccount',
      newValue: { filename, imported, received, accounts: accountsTouched },
    });

    const reconciliation = await ReconciliationService.runReconciliation();
    return { filename, imported, received, accounts: accountsTouched, reconciliation };
  }

  // ─── File d'attente de vérification ───────────────────────────────────────

  static async listTransactions(filters: {
    status?: BankTxStatus;
    accountId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, accountId, search, page = 1, limit = 25 } = filters;

    const where: Prisma.BankTransactionWhereInput = {
      ...(status ? { status } : {}),
      ...(accountId ? { bankAccountId: accountId } : {}),
      ...(search
        ? {
            OR: [
              { debtorName: { contains: search, mode: 'insensitive' } },
              { remittanceInfo: { contains: search, mode: 'insensitive' } },
              { structuredRef: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        include: {
          bankAccount: { select: { iban: true, label: true } },
          matchedInvoice: {
            include: {
              quote: { select: { reference: true } },
              mandat: { select: { title: true, client: { select: { firstName: true, lastName: true, company: true } } } },
            },
          },
          matchedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Indicateurs de pilotage, dont le taux de rapprochement automatique sur les
   * paiements porteurs d'une référence (critère d'acceptation : > 70 %).
   */
  static async getStats() {
    const [byStatus, credits, accounts] = await Promise.all([
      prisma.bankTransaction.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.bankTransaction.findMany({
        where: { creditDebit: 'CRDT' },
        select: {
          status: true,
          matchedById: true,
          structuredRef: true,
          remittanceInfo: true,
          endToEndId: true,
        },
      }),
      prisma.bankAccount.count({ where: { isActive: true } }),
    ]);

    const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<
      BankTxStatus,
      number
    >;

    const referenced = credits.filter((transaction) => ReconciliationService.carriesCrmReference(transaction));
    const referencedAuto = referenced.filter(
      (transaction) => transaction.status === BankTxStatus.MATCHED && transaction.matchedById === null,
    );
    const autoMatched = credits.filter(
      (transaction) => transaction.status === BankTxStatus.MATCHED && transaction.matchedById === null,
    );

    return {
      accounts,
      total: credits.length,
      matched: counts.MATCHED ?? 0,
      suggested: counts.SUGGESTED ?? 0,
      unmatched: counts.UNMATCHED ?? 0,
      ignored: counts.IGNORED ?? 0,
      pendingReview: (counts.SUGGESTED ?? 0) + (counts.UNMATCHED ?? 0),
      autoMatched: autoMatched.length,
      /** Taux global de rapprochement automatique sur les crédits */
      autoMatchRate: credits.length ? autoMatched.length / credits.length : 0,
      referencedCredits: referenced.length,
      /** Critère d'acceptation de l'issue #119 : > 70 % sur les paiements référencés */
      referencedAutoMatchRate: referenced.length ? referencedAuto.length / referenced.length : 0,
    };
  }

  /** Candidats proposés pour une écriture (recalculés à la volée) */
  static async getCandidates(transactionId: string) {
    const transaction = await prisma.bankTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new ValidationError('Écriture bancaire introuvable');

    const invoices = await prisma.invoice.findMany({
      where: { status: InvoiceStatus.PENDING },
      include: {
        quote: { select: { reference: true } },
        mandat: { include: { client: true } },
      },
    });

    return ReconciliationService.rankCandidates(transaction, invoices);
  }

  /** Validation humaine d'un rapprochement depuis la file d'attente */
  static async matchManually(transactionId: string, invoiceId: string, userId: string) {
    const transaction = await prisma.bankTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new ValidationError('Écriture bancaire introuvable');
    if (transaction.status === BankTxStatus.MATCHED) {
      throw new ValidationError('Cette écriture est déjà rapprochée');
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new ValidationError('Facture introuvable');
    if (invoice.status === InvoiceStatus.PAID) throw new ValidationError('Cette facture est déjà payée');

    // Le score du candidat retenu est conservé s'il avait été proposé
    const suggestions = (transaction.suggestions as unknown as Array<{ invoiceId: string; score: number }>) ?? [];
    const suggested = Array.isArray(suggestions) ? suggestions.find((item) => item.invoiceId === invoiceId) : undefined;

    return ReconciliationService.applyMatch(
      transaction,
      { invoiceId, score: suggested?.score ?? 1, method: 'MANUAL' },
      { userId, sendReceipt: true },
    );
  }

  /** Écarte une écriture (frais bancaires, virement interne, remboursement…) */
  static async ignoreTransaction(transactionId: string, reason: string, userId: string) {
    const transaction = await prisma.bankTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new ValidationError('Écriture bancaire introuvable');

    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        status: BankTxStatus.IGNORED,
        ignoredReason: reason || 'Écartée manuellement',
        matchedById: userId,
        matchedAt: new Date(),
      },
    });

    await AuditService.log({
      userId,
      action: 'BANK_TX_IGNORED',
      entity: 'BankTransaction',
      entityId: transactionId,
      newValue: { reason },
    });

    return updated;
  }

  /** Annule un rapprochement : la facture repasse en attente de paiement */
  static async unmatchTransaction(transactionId: string, userId: string) {
    const transaction = await prisma.bankTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new ValidationError('Écriture bancaire introuvable');

    if (transaction.matchedInvoiceId) {
      await prisma.invoice.update({
        where: { id: transaction.matchedInvoiceId },
        data: { status: InvoiceStatus.PENDING, paymentDate: null, bankReference: null },
      });
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        status: BankTxStatus.UNMATCHED,
        matchedInvoiceId: null,
        matchScore: null,
        matchMethod: null,
        matchedAt: null,
        matchedById: null,
        ignoredReason: null,
      },
    });

    await AuditService.log({
      userId,
      action: 'BANK_TX_UNMATCHED',
      entity: 'BankTransaction',
      entityId: transactionId,
      oldValue: { invoiceId: transaction.matchedInvoiceId },
    });

    return updated;
  }

  // ─── Référence de paiement des factures ───────────────────────────────────

  /**
   * Attribue (si absente) une référence QR à une facture. C'est cette référence,
   * imprimée sur la facture, qui permet à la banque de restituer un identifiant
   * exploitable et donc d'atteindre un rapprochement automatique fiable.
   */
  static async ensurePaymentReference(invoiceId: string) {
    return ensureInvoicePaymentReference(invoiceId);
  }
}
