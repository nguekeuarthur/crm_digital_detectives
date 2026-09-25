import { api } from './base';

export type BankTxStatus = 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'IGNORED';
export type BankProviderKind = 'UBS_BLINK' | 'CAMT_FILE' | 'MOCK';
export type MatchMethod =
  | 'QR_REFERENCE'
  | 'REFERENCE_IN_TEXT'
  | 'INVOICE_ID'
  | 'MANDATE_ID'
  | 'AMOUNT_AND_NAME'
  | 'AMOUNT_ONLY'
  | 'MANUAL';

export interface BankAccount {
  id: string;
  iban: string;
  label: string;
  currency: string;
  provider: BankProviderKind;
  isActive: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  _count?: { transactions: number };
}

export interface MatchCandidate {
  invoiceId: string;
  score: number;
  method: MatchMethod;
  reasons: string[];
  invoiceLabel: string;
  invoiceAmount: number;
  clientName: string;
}

export interface BankTransaction {
  id: string;
  bookingDate: string;
  valueDate?: string | null;
  amount: number;
  currency: string;
  creditDebit: 'CRDT' | 'DBIT';
  remittanceInfo?: string | null;
  structuredRef?: string | null;
  endToEndId?: string | null;
  debtorName?: string | null;
  debtorIban?: string | null;
  status: BankTxStatus;
  matchScore?: number | null;
  matchMethod?: MatchMethod | null;
  matchedAt?: string | null;
  matchedById?: string | null;
  ignoredReason?: string | null;
  suggestions?: MatchCandidate[] | null;
  bankAccount?: { iban: string; label: string };
  matchedBy?: { firstName: string; lastName: string } | null;
  matchedInvoice?: {
    id: string;
    amount: number;
    quote?: { reference: string } | null;
    mandat?: {
      title: string;
      client?: { firstName: string; lastName: string; company?: string | null };
    };
  } | null;
}

export interface BankingStats {
  accounts: number;
  total: number;
  matched: number;
  suggested: number;
  unmatched: number;
  ignored: number;
  pendingReview: number;
  autoMatched: number;
  autoMatchRate: number;
  referencedCredits: number;
  /** Critère d'acceptation : > 0.7 */
  referencedAutoMatchRate: number;
}

export interface SyncResult {
  imported: number;
  errors: string[];
  accounts: Array<{ iban: string; imported: number; received: number }>;
  reconciliation: { processed: number; auto: number; suggested: number; unmatched: number; ignored: number };
}

export class BankingApi {
  static async listAccounts(): Promise<BankAccount[]> {
    const { data } = await api.get('/banking/accounts');
    return data;
  }

  static async registerAccount(payload: {
    iban: string;
    label: string;
    currency?: string;
    provider?: BankProviderKind;
  }): Promise<BankAccount> {
    const { data } = await api.post('/banking/accounts', payload);
    return data;
  }

  static async discoverAccounts(provider?: BankProviderKind): Promise<BankAccount[]> {
    const { data } = await api.post('/banking/accounts/discover', { provider });
    return data;
  }

  static async sync(days?: number): Promise<SyncResult> {
    const { data } = await api.post('/banking/sync', days ? { days } : {});
    return data;
  }

  static async importCamt(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/banking/import/camt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { imported: number; received: number; accounts: string[] };
  }

  static async listTransactions(params: {
    status?: BankTxStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: BankTransaction[]; total: number; page: number; pages: number }> {
    const { data } = await api.get('/banking/transactions', { params });
    return data;
  }

  static async getStats(): Promise<BankingStats> {
    const { data } = await api.get('/banking/stats');
    return data;
  }

  static async getCandidates(transactionId: string): Promise<MatchCandidate[]> {
    const { data } = await api.get(`/banking/transactions/${transactionId}/candidates`);
    return data;
  }

  static async match(transactionId: string, invoiceId: string) {
    const { data } = await api.post(`/banking/transactions/${transactionId}/match`, { invoiceId });
    return data;
  }

  static async ignore(transactionId: string, reason?: string) {
    const { data } = await api.post(`/banking/transactions/${transactionId}/ignore`, { reason });
    return data;
  }

  static async unmatch(transactionId: string) {
    const { data } = await api.post(`/banking/transactions/${transactionId}/unmatch`);
    return data;
  }

  static async getAuthorizationUrl(username?: string): Promise<{ url: string; state: string; scope: string }> {
    const { data } = await api.get('/banking/connect/authorize-url', { params: { username } });
    return data;
  }

  /** Échange le code de consentement reçu d'UBS contre les jetons de lecture */
  static async exchangeAuthorizationCode(code: string, username?: string): Promise<{ status: string; accounts: BankAccount[] }> {
    const { data } = await api.post('/banking/connect/exchange', { code, username });
    return data;
  }
}

export const MATCH_METHOD_LABELS: Record<MatchMethod, string> = {
  QR_REFERENCE: 'Référence QR',
  REFERENCE_IN_TEXT: 'Référence dans la communication',
  INVOICE_ID: 'Numéro de facture',
  MANDATE_ID: 'Identifiant de mandat',
  AMOUNT_AND_NAME: 'Montant + nom',
  AMOUNT_ONLY: 'Montant seul',
  MANUAL: 'Validation manuelle',
};
