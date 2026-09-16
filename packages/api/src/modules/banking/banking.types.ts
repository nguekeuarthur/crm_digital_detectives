/**
 * Types partagés du module bancaire (lecture seule).
 *
 * Le CRM ne pousse JAMAIS d'ordre vers la banque : tous les fournisseurs
 * implémentés ici se limitent à la consultation de comptes et d'écritures.
 */

export type CreditDebitIndicator = 'CRDT' | 'DBIT';

/**
 * Écriture bancaire normalisée, indépendante du fournisseur (bLink, camt.053, mock).
 */
export interface NormalizedBankTransaction {
  /** Identifiant stable côté banque (AcctSvcrRef / entryReference) — sert de clé d'idempotence */
  externalId: string;
  bookingDate: Date;
  valueDate?: Date;
  /** Toujours positif : le sens est porté par creditDebit */
  amount: number;
  currency: string;
  creditDebit: CreditDebitIndicator;
  /** Communication libre saisie par le payeur (RmtInf/Ustrd) */
  remittanceInfo?: string;
  /** Référence structurée QR / ISR / SCOR (RmtInf/Strd/CdtrRefInf/Ref) */
  structuredRef?: string;
  endToEndId?: string;
  debtorName?: string;
  debtorIban?: string;
  /** Payload d'origine conservé pour la traçabilité / le support */
  raw?: Record<string, unknown>;
}

/** Compte bancaire tel que retourné par le fournisseur */
export interface NormalizedBankAccount {
  iban: string;
  label: string;
  currency: string;
  providerAccountId?: string;
}

export interface FetchTransactionsParams {
  iban: string;
  providerAccountId?: string | null;
  dateFrom: Date;
  dateTo: Date;
}

/**
 * Contrat commun à tous les connecteurs bancaires.
 * Aucune méthode d'écriture n'est exposée — c'est volontaire et structurel.
 */
export interface BankDataProvider {
  readonly name: string;
  /** Vérifie que le connecteur est utilisable (config présente, consentement actif…) */
  isConfigured(): Promise<boolean> | boolean;
  listAccounts(): Promise<NormalizedBankAccount[]>;
  fetchTransactions(params: FetchTransactionsParams): Promise<NormalizedBankTransaction[]>;
}
