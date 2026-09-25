import fs from 'fs';
import path from 'path';
import { parseCamtDocument } from '../camt-parser';
import {
  BankDataProvider,
  FetchTransactionsParams,
  NormalizedBankAccount,
  NormalizedBankTransaction,
} from '../banking.types';

/**
 * Connecteur "fichier camt.053".
 *
 * Il lit les relevés ISO 20022 déposés dans un dossier de dépôt (export manuel
 * depuis l'E-Banking UBS, ou dépôt SFTP automatisé). Il permet d'exploiter le
 * rapprochement automatique immédiatement, sans attendre la contractualisation
 * bLink, avec exactement les mêmes données (référence QR incluse).
 *
 * Lecture seule par nature : le connecteur ne fait qu'ouvrir des fichiers.
 */
export class CamtFileProvider implements BankDataProvider {
  readonly name = 'CAMT_FILE';
  private readonly importDir: string;
  private readonly archiveDir: string;

  constructor(importDir = process.env.BANK_CAMT_IMPORT_DIR || './storage/bank-import') {
    this.importDir = importDir;
    this.archiveDir = path.join(importDir, 'processed');
  }

  isConfigured(): boolean {
    return fs.existsSync(this.importDir);
  }

  /** Liste les comptes présents dans les relevés déposés */
  async listAccounts(): Promise<NormalizedBankAccount[]> {
    const accounts = new Map<string, NormalizedBankAccount>();

    for (const file of this.listCamtFiles()) {
      for (const statement of this.safeParse(file)) {
        if (!statement.iban) continue;
        accounts.set(statement.iban, {
          iban: statement.iban,
          label: `Compte ${statement.iban}`,
          currency: statement.currency,
        });
      }
    }

    return [...accounts.values()];
  }

  /**
   * Lit tous les relevés du dossier de dépôt et retourne les écritures du compte
   * demandé sur la période. Les fichiers traités sont archivés dans `processed/`
   * pour éviter de les relire à chaque exécution du cron.
   */
  async fetchTransactions(params: FetchTransactionsParams): Promise<NormalizedBankTransaction[]> {
    const transactions: NormalizedBankTransaction[] = [];

    for (const file of this.listCamtFiles()) {
      let fileHadContent = false;

      for (const statement of this.safeParse(file)) {
        if (params.iban && statement.iban && statement.iban !== params.iban) continue;
        fileHadContent = true;

        for (const transaction of statement.transactions) {
          if (transaction.bookingDate < params.dateFrom || transaction.bookingDate > params.dateTo) continue;
          transactions.push(transaction);
        }
      }

      if (fileHadContent) this.archive(file);
    }

    return transactions;
  }

  /** Parse un relevé fourni directement (upload manuel depuis le CRM) */
  static parseBuffer(buffer: Buffer) {
    return parseCamtDocument(buffer);
  }

  private listCamtFiles(): string[] {
    if (!fs.existsSync(this.importDir)) return [];
    return fs
      .readdirSync(this.importDir)
      .filter((file) => /\.(xml|camt)$/i.test(file))
      .map((file) => path.join(this.importDir, file));
  }

  private safeParse(filePath: string) {
    try {
      return parseCamtDocument(fs.readFileSync(filePath));
    } catch (error) {
      console.error(`❌ [camt] Fichier illisible ignoré (${path.basename(filePath)}) :`, (error as Error).message);
      return [];
    }
  }

  private archive(filePath: string) {
    try {
      fs.mkdirSync(this.archiveDir, { recursive: true });
      const target = path.join(this.archiveDir, `${Date.now()}-${path.basename(filePath)}`);
      fs.renameSync(filePath, target);
    } catch (error) {
      console.error("⚠️ [camt] Archivage du relevé impossible :", (error as Error).message);
    }
  }
}
