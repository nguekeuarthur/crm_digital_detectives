import https from 'https';
import fs from 'fs';
import { URL, URLSearchParams } from 'url';
import { ConsentStatus } from '@prisma/client';
import { prisma } from '../../../shared/prisma';
import { ValidationError } from '../../../shared/errors';
import { encryptSecret, decryptSecret } from '../banking.crypto';
import { parseCamtDocument } from '../camt-parser';
import {
  BankDataProvider,
  FetchTransactionsParams,
  NormalizedBankAccount,
  NormalizedBankTransaction,
  CreditDebitIndicator,
} from '../banking.types';

/**
 * Connecteur UBS via la plate-forme d'open banking suisse SIX bLink.
 *
 * Garanties de lecture seule :
 *  - seul le scope AIS (`urn:blink:xs2a:ais`) est demandé, le scope de paiement
 *    (`...:pss:write`) est explicitement rejeté par assertReadOnlyScope() ;
 *  - toutes les requêtes de données bancaires passent par get(), qui n'accepte
 *    aucun autre verbe HTTP ;
 *  - le seul POST émis vise le serveur d'autorisation OAuth (obtention et
 *    rafraîchissement du jeton), jamais une ressource bancaire.
 *
 * Prérequis côté banque : contrat SIX (Service User), certificat client mTLS et
 * enregistrement des URL de redirection dans l'annuaire bLink.
 */

export const BLINK_AIS_SCOPE = 'urn:blink:xs2a:ais';

interface BlinkConfig {
  baseUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  providerId: string;
  redirectUri: string;
  username: string;
  certPath?: string;
  keyPath?: string;
  keyPassphrase?: string;
}

function readConfig(): BlinkConfig {
  return {
    baseUrl: process.env.BLINK_API_BASE_URL || 'https://api.six-group.com/api/bankingservices/b-link-xs2a/v1',
    authorizationUrl: process.env.BLINK_AUTHORIZATION_URL || '',
    tokenUrl:
      process.env.BLINK_TOKEN_URL ||
      'https://api.six-group.com/api/bankingservices/b-link-consent-2/consent-flow/v2/oauth/token',
    clientId: process.env.BLINK_CLIENT_ID || '',
    providerId: process.env.BLINK_PROVIDER_ID || '',
    redirectUri: process.env.BLINK_REDIRECT_URI || '',
    username: process.env.BLINK_USERNAME || '',
    certPath: process.env.BLINK_CLIENT_CERT_PATH,
    keyPath: process.env.BLINK_CLIENT_KEY_PATH,
    keyPassphrase: process.env.BLINK_CLIENT_KEY_PASSPHRASE,
  };
}

/** Refuse tout scope autorisant l'écriture (paiements) : garde-fou volontaire */
export function assertReadOnlyScope(scope: string): void {
  const forbidden = ['pss', 'write', 'payment'];
  const lowered = scope.toLowerCase();
  if (forbidden.some((token) => lowered.includes(token))) {
    throw new ValidationError(
      `Scope bancaire refuse : "${scope}". La connexion bancaire du CRM est strictement en lecture seule.`,
    );
  }
}

export class BlinkProvider implements BankDataProvider {
  readonly name = 'UBS_BLINK';
  private readonly config: BlinkConfig;

  constructor(config: BlinkConfig = readConfig()) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.providerId && this.config.certPath && this.config.keyPath);
  }

  // ─── OAuth2 / consentement ────────────────────────────────────────────────

  /**
   * URL de consentement à ouvrir dans le navigateur de l'utilisateur.
   * Le titulaire du compte valide l'accès en lecture directement chez UBS.
   */
  buildAuthorizationUrl(state: string, username = this.config.username): string {
    if (!this.config.authorizationUrl) {
      throw new ValidationError("BLINK_AUTHORIZATION_URL n'est pas configurée");
    }
    assertReadOnlyScope(BLINK_AIS_SCOPE);

    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', BLINK_AIS_SCOPE);
    url.searchParams.set('username', username);
    url.searchParams.set('provider_id', this.config.providerId);
    return url.toString();
  }

  /** Échange le code d'autorisation contre un couple access/refresh token */
  async exchangeAuthorizationCode(code: string, username = this.config.username) {
    const tokens = await this.postToken({
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      username,
    });
    await this.persistTokens(tokens);
    return tokens;
  }

  /** Rafraîchit le jeton d'accès expiré */
  async refreshAccessToken(refreshToken: string) {
    const tokens = await this.postToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });
    await this.persistTokens(tokens);
    return tokens;
  }

  /** Jeton d'accès valide, rafraîchi automatiquement si nécessaire */
  private async getAccessToken(): Promise<string> {
    const connection = await prisma.bankConnection.findFirst({
      where: { provider: 'UBS_BLINK' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection || connection.consentStatus === ConsentStatus.REVOKED) {
      throw new ValidationError('Aucun consentement bLink actif : reliez le compte UBS depuis les paramètres.');
    }

    const accessToken = decryptSecret(connection.accessToken);
    const stillValid = connection.expiresAt && connection.expiresAt.getTime() - 60_000 > Date.now();
    if (accessToken && stillValid) return accessToken;

    const refreshToken = decryptSecret(connection.refreshToken);
    if (!refreshToken) {
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { consentStatus: ConsentStatus.EXPIRED, lastError: 'Jeton expiré et refresh token absent' },
      });
      throw new ValidationError('Consentement bLink expiré : une nouvelle autorisation UBS est nécessaire.');
    }

    const refreshed = await this.refreshAccessToken(refreshToken);
    return refreshed.access_token;
  }

  private async persistTokens(tokens: { access_token: string; refresh_token?: string; expires_in?: number }) {
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
    const existing = await prisma.bankConnection.findFirst({ where: { provider: 'UBS_BLINK' } });

    const data = {
      provider: 'UBS_BLINK' as const,
      providerId: this.config.providerId,
      oauthClientId: this.config.clientId,
      scope: BLINK_AIS_SCOPE,
      accessToken: encryptSecret(tokens.access_token),
      ...(tokens.refresh_token ? { refreshToken: encryptSecret(tokens.refresh_token) } : {}),
      expiresAt,
      consentStatus: ConsentStatus.ACTIVE,
      consentSignedAt: existing?.consentSignedAt ?? new Date(),
      lastError: null,
    };

    if (existing) {
      await prisma.bankConnection.update({ where: { id: existing.id }, data });
    } else {
      await prisma.bankConnection.create({ data });
    }
  }

  // ─── Transport HTTP (mTLS) ────────────────────────────────────────────────

  private buildAgent(): https.Agent {
    if (!this.config.certPath || !this.config.keyPath) {
      throw new ValidationError('Certificat client bLink manquant (BLINK_CLIENT_CERT_PATH / BLINK_CLIENT_KEY_PATH)');
    }
    return new https.Agent({
      cert: fs.readFileSync(this.config.certPath),
      key: fs.readFileSync(this.config.keyPath),
      passphrase: this.config.keyPassphrase,
      keepAlive: true,
      minVersion: 'TLSv1.2',
    });
  }

  /**
   * Unique porte de sortie vers les ressources bancaires : GET exclusivement.
   * Le verbe est écrit en dur, il n'est pas paramétrable.
   */
  private get(
    path: string,
    accessToken: string,
  ): Promise<{ body: string; headers: Record<string, string | string[] | undefined> }> {
    const url = new URL(path.startsWith('http') ? path : `${this.config.baseUrl}${path}`);

    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          method: 'GET',
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 443,
          path: `${url.pathname}${url.search}`,
          agent: this.buildAgent(),
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json, application/xml',
            'x-corapi-target-id': this.config.providerId,
            'x-corapi-client-id': this.config.clientId,
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const status = response.statusCode ?? 0;
            if (status >= 200 && status < 300) {
              resolve({ body, headers: response.headers });
            } else {
              reject(new Error(`bLink ${status} sur ${url.pathname} : ${body.slice(0, 500)}`));
            }
          });
        },
      );

      request.on('error', reject);
      request.setTimeout(30_000, () => request.destroy(new Error("Délai dépassé sur l'API bLink")));
      request.end();
    });
  }

  /** POST réservé au serveur d'autorisation OAuth (jamais aux ressources bancaires) */
  private postToken(
    payload: Record<string, string>,
  ): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    const url = new URL(this.config.tokenUrl);
    const body = new URLSearchParams(payload).toString();

    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          method: 'POST',
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          agent: this.buildAgent(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            Accept: 'application/json',
            'x-corapi-target-id': this.config.providerId,
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            const status = response.statusCode ?? 0;
            if (status < 200 || status >= 300) {
              return reject(new Error(`bLink token ${status} : ${raw.slice(0, 500)}`));
            }
            try {
              resolve(JSON.parse(raw));
            } catch {
              reject(new Error('Réponse OAuth bLink illisible'));
            }
          });
        },
      );

      request.on('error', reject);
      request.setTimeout(30_000, () => request.destroy(new Error("Délai dépassé sur l'authentification bLink")));
      request.write(body);
      request.end();
    });
  }

  // ─── AIS : comptes et écritures ───────────────────────────────────────────

  async listAccounts(): Promise<NormalizedBankAccount[]> {
    const accessToken = await this.getAccessToken();
    const { body } = await this.get('/accounts', accessToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = JSON.parse(body) as { accounts?: any[] };

    return (payload.accounts ?? []).map((account) => ({
      iban: account.iban ?? account.bban ?? '',
      label: account.name ?? account.product ?? account.iban ?? 'Compte UBS',
      currency: account.currency ?? 'CHF',
      providerAccountId: account.resourceId ?? account.id,
    }));
  }

  /**
   * Récupère les écritures d'une période.
   * On privilégie le camt.053 (référence QR structurée fiable) et on retombe
   * sur l'endpoint JSON si la banque n'a pas encore publié de relevé.
   */
  async fetchTransactions(params: FetchTransactionsParams): Promise<NormalizedBankTransaction[]> {
    const accessToken = await this.getAccessToken();

    try {
      return await this.fetchFromStatements(accessToken, params);
    } catch (error) {
      console.warn(
        "⚠️ [bLink] Relevés camt.053 indisponibles, repli sur l'endpoint JSON :",
        (error as Error).message,
      );
      return this.fetchFromJson(accessToken, params);
    }
  }

  /** Endpoint ISO 20022 : GET /iso20022/statements puis /iso20022/statements/{reportId} */
  private async fetchFromStatements(
    accessToken: string,
    params: FetchTransactionsParams,
  ): Promise<NormalizedBankTransaction[]> {
    const query = new URLSearchParams({
      date_from: params.dateFrom.toISOString().slice(0, 10),
      date_to: params.dateTo.toISOString().slice(0, 10),
    });
    if (params.providerAccountId) query.set('account_id', params.providerAccountId);

    const { body } = await this.get(`/iso20022/statements?${query.toString()}`, accessToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = JSON.parse(body) as { statements?: any[] };
    const transactions: NormalizedBankTransaction[] = [];

    for (const statement of payload.statements ?? []) {
      const reportId = statement.reportId ?? statement.id;
      if (!reportId) continue;

      const { body: camtXml } = await this.get(
        `/iso20022/statements/${encodeURIComponent(reportId)}`,
        accessToken,
      );
      for (const parsed of parseCamtDocument(camtXml)) {
        if (params.iban && parsed.iban && parsed.iban !== params.iban) continue;
        transactions.push(...parsed.transactions);
      }
    }

    return transactions;
  }

  /** Endpoint JSON paginé : GET /accounts/{id}/transactions (curseur X-Next-Cursor) */
  private async fetchFromJson(
    accessToken: string,
    params: FetchTransactionsParams,
  ): Promise<NormalizedBankTransaction[]> {
    if (!params.providerAccountId) {
      throw new ValidationError("Identifiant de compte bLink inconnu : lancez d'abord la découverte des comptes.");
    }

    const transactions: NormalizedBankTransaction[] = [];
    let cursor: string | undefined;

    do {
      const query = new URLSearchParams({
        date_from: params.dateFrom.toISOString().slice(0, 10),
        date_to: params.dateTo.toISOString().slice(0, 10),
        entryStatus: 'booked',
        limit: '200',
      });
      if (cursor) query.set('cursor', cursor);

      const { body, headers } = await this.get(
        `/accounts/${encodeURIComponent(params.providerAccountId)}/transactions?${query.toString()}`,
        accessToken,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = JSON.parse(body) as { transactions?: any[] };
      for (const entry of payload.transactions ?? []) {
        transactions.push(this.normalizeJsonTransaction(entry));
      }

      const nextCursor = headers['x-next-cursor'];
      cursor = Array.isArray(nextCursor) ? nextCursor[0] : nextCursor || undefined;
    } while (cursor);

    return transactions;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeJsonTransaction(entry: any): NormalizedBankTransaction {
    const rawAmount = Number(entry.amount?.amount ?? entry.transactionAmount?.amount ?? entry.amount ?? 0);
    const creditDebit: CreditDebitIndicator =
      (entry.creditDebitIndicator as CreditDebitIndicator) ?? (rawAmount < 0 ? 'DBIT' : 'CRDT');

    return {
      externalId: entry.entryReference ?? entry.transactionId ?? entry.id,
      bookingDate: new Date(entry.bookingDate ?? entry.valueDate),
      valueDate: entry.valueDate ? new Date(entry.valueDate) : undefined,
      amount: Math.abs(rawAmount),
      currency: entry.amount?.currency ?? entry.transactionAmount?.currency ?? 'CHF',
      creditDebit,
      remittanceInfo: entry.remittanceInformationUnstructured ?? entry.additionalInformation,
      structuredRef: entry.remittanceInformationStructured?.reference ?? entry.creditorReference,
      endToEndId: entry.endToEndId,
      debtorName: entry.debtorName ?? entry.debtor?.name,
      debtorIban: entry.debtorAccount?.iban,
      raw: entry,
    };
  }
}
