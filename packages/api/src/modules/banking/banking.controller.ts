import { Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { z } from 'zod';
import { BankTxStatus } from '@prisma/client';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { ValidationError } from '../../shared/errors';
import { BankingService } from './banking.service';
import { ReconciliationService } from './reconciliation.service';
import { BlinkProvider } from './providers';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // un camt.053 mensuel dépasse rarement 1 Mo
});

const registerAccountSchema = z.object({
  iban: z.string().min(15),
  label: z.string().min(2),
  currency: z.string().length(3).optional(),
  provider: z.enum(['UBS_BLINK', 'CAMT_FILE', 'MOCK']).optional(),
  providerAccountId: z.string().optional(),
});

const matchSchema = z.object({ invoiceId: z.string().uuid() });
const ignoreSchema = z.object({ reason: z.string().max(300).optional() });
const syncSchema = z.object({ days: z.number().int().min(1).max(365).optional() });
const exchangeSchema = z.object({ code: z.string().min(4), username: z.string().optional() });

export class BankingController {
  static uploadCamtMiddleware = upload.single('file');

  // ─── Comptes ──────────────────────────────────────────────────────────────

  static async listAccounts(_req: AuthRequest, res: Response) {
    res.json(await BankingService.listAccounts());
  }

  static async registerAccount(req: AuthRequest, res: Response) {
    const payload = registerAccountSchema.parse(req.body);
    const account = await BankingService.registerAccount(payload, req.user!.userId);
    res.status(201).json(account);
  }

  static async discoverAccounts(req: AuthRequest, res: Response) {
    const provider = req.body?.provider as 'UBS_BLINK' | 'CAMT_FILE' | 'MOCK' | undefined;
    const accounts = await BankingService.discoverAccounts(provider, req.user!.userId);
    res.json(accounts);
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  static async sync(req: AuthRequest, res: Response) {
    const { days } = syncSchema.parse(req.body ?? {});
    const result = await BankingService.syncAll({ days, userId: req.user!.userId });
    res.json(result);
  }

  static async importCamt(req: AuthRequest, res: Response) {
    if (!req.file) throw new ValidationError('Aucun fichier camt.053 fourni');

    const result = await BankingService.importCamtBuffer(
      req.file.buffer,
      req.file.originalname,
      req.user!.userId,
    );
    res.status(201).json(result);
  }

  // ─── File d'attente ───────────────────────────────────────────────────────

  static async listTransactions(req: AuthRequest, res: Response) {
    const { status, accountId, search, page, limit } = req.query;

    const result = await BankingService.listTransactions({
      status: status ? (String(status) as BankTxStatus) : undefined,
      accountId: accountId ? String(accountId) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  }

  static async getStats(_req: AuthRequest, res: Response) {
    res.json(await BankingService.getStats());
  }

  static async getCandidates(req: AuthRequest, res: Response) {
    res.json(await BankingService.getCandidates(req.params.id as string));
  }

  static async match(req: AuthRequest, res: Response) {
    const { invoiceId } = matchSchema.parse(req.body);
    const transaction = await BankingService.matchManually(req.params.id as string, invoiceId, req.user!.userId);
    res.json(transaction);
  }

  static async ignore(req: AuthRequest, res: Response) {
    const { reason } = ignoreSchema.parse(req.body ?? {});
    const transaction = await BankingService.ignoreTransaction(
      req.params.id as string,
      reason ?? '',
      req.user!.userId,
    );
    res.json(transaction);
  }

  static async unmatch(req: AuthRequest, res: Response) {
    const transaction = await BankingService.unmatchTransaction(req.params.id as string, req.user!.userId);
    res.json(transaction);
  }

  // ─── Consentement bLink (UBS) ─────────────────────────────────────────────

  /** Retourne l'URL de consentement UBS à ouvrir dans le navigateur */
  static async getAuthorizationUrl(req: AuthRequest, res: Response) {
    const provider = new BlinkProvider();
    if (!provider.isConfigured()) {
      throw new ValidationError(
        'Connecteur bLink non configuré : renseignez BLINK_CLIENT_ID, BLINK_PROVIDER_ID et le certificat client.',
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    const username = req.query.username ? String(req.query.username) : undefined;

    res.json({ url: provider.buildAuthorizationUrl(state, username), state, scope: 'urn:blink:xs2a:ais' });
  }

  /** Échange le code reçu après consentement contre les jetons de lecture */
  static async exchangeAuthorizationCode(req: AuthRequest, res: Response) {
    const { code, username } = exchangeSchema.parse(req.body);
    const provider = new BlinkProvider();
    await provider.exchangeAuthorizationCode(code, username);
    const accounts = await BankingService.discoverAccounts('UBS_BLINK', req.user!.userId);

    res.json({ status: 'ACTIVE', accounts });
  }

  // ─── Rapprochement / facturation ──────────────────────────────────────────

  /** (Re)lance le moteur de rapprochement sans réimporter d'écritures */
  static async reconcile(_req: AuthRequest, res: Response) {
    res.json(await ReconciliationService.runReconciliation());
  }

  /** Attribue une référence QR à une facture (à imprimer sur le document) */
  static async ensurePaymentReference(req: AuthRequest, res: Response) {
    const reference = await BankingService.ensurePaymentReference(req.params.invoiceId as string);
    res.json({ invoiceId: req.params.invoiceId, paymentReference: reference });
  }
}
