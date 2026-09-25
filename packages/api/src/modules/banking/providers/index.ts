import { BankProvider } from '@prisma/client';
import { BankDataProvider } from '../banking.types';
import { BlinkProvider } from './blink.provider';
import { CamtFileProvider } from './camt-file.provider';
import { MockProvider } from './mock.provider';

export { BlinkProvider, CamtFileProvider, MockProvider };

/**
 * Fabrique le connecteur correspondant au compte suivi.
 * Le choix est porté par le compte lui-même (BankAccount.provider), ce qui
 * permet de faire cohabiter un compte UBS relié via bLink et un compte encore
 * alimenté par export camt.053.
 */
export function getBankProvider(provider: BankProvider): BankDataProvider {
  switch (provider) {
    case 'UBS_BLINK':
      return new BlinkProvider();
    case 'CAMT_FILE':
      return new CamtFileProvider();
    case 'MOCK':
      return new MockProvider();
    default: {
      const exhaustive: never = provider;
      throw new Error(`Connecteur bancaire inconnu : ${exhaustive}`);
    }
  }
}

/** Connecteur par défaut, utilisé lors de l'enregistrement d'un nouveau compte */
export function getDefaultProviderKind(): BankProvider {
  const configured = (process.env.BANK_PROVIDER || 'CAMT_FILE').toUpperCase();
  const allowed: BankProvider[] = ['UBS_BLINK', 'CAMT_FILE', 'MOCK'];
  return (allowed as string[]).includes(configured) ? (configured as BankProvider) : 'CAMT_FILE';
}
