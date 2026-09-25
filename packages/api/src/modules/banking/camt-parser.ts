import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { NormalizedBankTransaction, CreditDebitIndicator } from './banking.types';

/**
 * Parseur ISO 20022 camt.053 (relevé de compte) et camt.052 (rapport intraday).
 *
 * C'est le format restitué aussi bien par l'API bLink (endpoint
 * `/iso20022/statements`) que par l'export manuel de l'E-Banking UBS : le même
 * parseur sert donc aux deux connecteurs.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  // Indispensable : sans cela les références à zéros non significatifs
  // (ex. "000000000000000000000012345") seraient converties en nombre.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

export interface ParsedStatement {
  iban: string;
  currency: string;
  /** Identifiant du relevé (Stmt/Id), utile pour la traçabilité */
  statementId?: string;
  transactions: NormalizedBankTransaction[];
}

/** Normalise un nœud éventuellement absent / unique / répété en tableau */
function toArray(node: XmlNode): XmlNode[] {
  if (node === undefined || node === null) return [];
  return Array.isArray(node) ? node : [node];
}

/** Récupère le texte d'un nœud, qu'il soit scalaire ou objet à attributs */
function text(node: XmlNode): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'object') {
    const value = node['#text'];
    return value === undefined ? undefined : String(value).trim();
  }
  const value = String(node).trim();
  return value.length ? value : undefined;
}

/**
 * Nom d'une partie (donneur d'ordre ou bénéficiaire).
 *
 * Trois écritures possibles selon la version du schéma et la banque :
 * `Dbtr/Nm`, `Dbtr/Pty/Nm`, et — pour les versements e-banking d'UBS — pas de
 * `Nm` du tout, le nom figurant alors en première ligne d'adresse. Sans ce
 * dernier repli, un vrai virement client sans référence resterait anonyme et
 * ne pourrait être rapproché ni automatiquement, ni à l'œil.
 */
function nomDePartie(partie: XmlNode): string | undefined {
  if (!partie || typeof partie !== 'object') return undefined;

  const direct = text(partie.Nm) ?? text(partie.Pty?.Nm);
  if (direct) return direct;

  const adresse = partie.Pty?.PstlAdr ?? partie.PstlAdr;
  const lignes = toArray(adresse?.AdrLine)
    .map((l) => text(l))
    .filter((l): l is string => Boolean(l));

  // La première ligne porte le nom, les suivantes le code postal et la ville
  return lignes[0];
}

/** Lit une date ISO 20022 (<Dt> ou <DtTm>) */
function readDate(node: XmlNode): Date | undefined {
  const raw = text(node?.Dt) ?? text(node?.DtTm) ?? text(node);
  if (!raw) return undefined;
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Concatène les communications libres (RmtInf/Ustrd peut être répété) */
function readUnstructured(remittance: XmlNode): string | undefined {
  const parts = toArray(remittance?.Ustrd).map(text).filter(Boolean) as string[];
  return parts.length ? parts.join(' ') : undefined;
}

/** Référence structurée QR / ISR / SCOR */
function readStructuredRef(remittance: XmlNode): string | undefined {
  for (const structured of toArray(remittance?.Strd)) {
    const reference = text(structured?.CdtrRefInf?.Ref);
    if (reference) return reference;
  }
  return undefined;
}

/** Identifiant stable : à défaut de référence bancaire, on hache le contenu de l'écriture */
function buildFallbackId(iban: string, parts: Array<string | number | undefined>): string {
  const hash = crypto.createHash('sha1').update([iban, ...parts].join('|')).digest('hex');
  return `SYN-${hash.slice(0, 24)}`;
}

/** Extrait les écritures d'un relevé (Stmt de camt.053 ou Rpt de camt.052) */
function parseStatement(statement: XmlNode): ParsedStatement {
  const iban = text(statement?.Acct?.Id?.IBAN) ?? text(statement?.Acct?.Id?.Othr?.Id) ?? '';
  const currency = text(statement?.Acct?.Ccy) ?? 'CHF';
  const transactions: NormalizedBankTransaction[] = [];

  toArray(statement?.Ntry).forEach((entry, entryIndex) => {
    const entryAmount = Number(text(entry?.Amt) ?? '0');
    const entryCurrency = entry?.Amt?.['@_Ccy'] ?? currency;
    const entryCreditDebit = (text(entry?.CdtDbtInd) ?? 'CRDT') as CreditDebitIndicator;
    const bookingDate = readDate(entry?.BookgDt) ?? readDate(entry?.ValDt) ?? new Date();
    const valueDate = readDate(entry?.ValDt);
    const entryReference = text(entry?.AcctSvcrRef) ?? text(entry?.NtryRef);
    const additionalInfo = text(entry?.AddtlNtryInf);

    // Une écriture groupée (LSV, encaissements QR d'une journée) porte plusieurs
    // TxDtls : on les éclate pour rapprocher chaque paiement individuellement.
    const details = toArray(entry?.NtryDtls).flatMap((ntryDtls) => toArray(ntryDtls?.TxDtls));

    if (!details.length) {
      transactions.push({
        externalId: entryReference ?? buildFallbackId(iban, [bookingDate.toISOString(), entryAmount, additionalInfo, entryIndex]),
        bookingDate,
        valueDate,
        amount: Math.abs(entryAmount),
        currency: entryCurrency,
        creditDebit: entryCreditDebit,
        remittanceInfo: additionalInfo,
        raw: { entryReference, additionalInfo },
      });
      return;
    }

    details.forEach((detail, detailIndex) => {
      const amount = Number(text(detail?.Amt) ?? entryAmount);
      const remittance = detail?.RmtInf;
      const remittanceInfo = readUnstructured(remittance) ?? additionalInfo;
      const structuredRef = readStructuredRef(remittance);
      const endToEndId = text(detail?.Refs?.EndToEndId);
      const detailReference =
        text(detail?.Refs?.AcctSvcrRef) ??
        text(detail?.Refs?.TxId) ??
        (details.length > 1 ? undefined : entryReference);

      // Sur un crédit c'est le donneur d'ordre qui nous intéresse ; sur un
      // débit, le bénéficiaire — sans quoi la file d'attente n'afficherait
      // qu'une ligne anonyme pour les paiements sortants.
      const sens = (text(detail?.CdtDbtInd) ?? entryCreditDebit) as CreditDebitIndicator;
      const contrepartie = sens === 'CRDT' ? detail?.RltdPties?.Dbtr : detail?.RltdPties?.Cdtr;
      const debtorName = nomDePartie(contrepartie) ?? nomDePartie(detail?.RltdPties?.UltmtDbtr);
      const debtorIban = text(detail?.RltdPties?.DbtrAcct?.Id?.IBAN);

      transactions.push({
        externalId:
          detailReference ??
          buildFallbackId(iban, [
            bookingDate.toISOString(),
            amount,
            structuredRef ?? endToEndId ?? remittanceInfo,
            entryIndex,
            detailIndex,
          ]),
        bookingDate,
        valueDate,
        amount: Math.abs(amount),
        currency: detail?.Amt?.['@_Ccy'] ?? entryCurrency,
        creditDebit: (text(detail?.CdtDbtInd) ?? entryCreditDebit) as CreditDebitIndicator,
        remittanceInfo,
        structuredRef,
        endToEndId,
        debtorName,
        debtorIban,
        raw: { entryReference, additionalInfo, structuredRef, endToEndId },
      });
    });
  });

  return {
    iban,
    currency,
    statementId: text(statement?.Id),
    transactions,
  };
}

/**
 * Parse un document camt.053 / camt.052 et retourne les relevés qu'il contient.
 * @throws si le document n'est pas un camt exploitable
 */
export function parseCamtDocument(xml: string | Buffer): ParsedStatement[] {
  const document = parser.parse(xml.toString())?.Document;

  if (!document) {
    throw new Error('Document camt invalide : balise <Document> introuvable');
  }

  // camt.053 = relevé de compte, camt.052 = rapport intraday
  const statements = [
    ...toArray(document?.BkToCstmrStmt?.Stmt),
    ...toArray(document?.BkToCstmrAcctRpt?.Rpt),
  ];

  if (!statements.length) {
    throw new Error('Document camt invalide : aucun relevé (Stmt/Rpt) trouvé');
  }

  return statements.map(parseStatement);
}
