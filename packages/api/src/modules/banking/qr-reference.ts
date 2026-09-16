/**
 * Références de paiement suisses.
 *
 * Deux formats coexistent sur les QR-factures :
 *  - la référence QR (QRR) : 27 chiffres, clé de contrôle modulo 10 récursif
 *    (héritée du BVR/ISR, utilisée quand le CRM facture depuis un compte QR-IBAN) ;
 *  - la référence créancier SCOR (ISO 11649) : "RF" + clé modulo 97 + 21 caractères.
 *
 * C'est ce champ qui rend le rapprochement automatique fiable : la banque le
 * restitue tel quel dans le camt.053 (RmtInf/Strd/CdtrRefInf/Ref).
 */

/** Table du modulo 10 récursif (norme suisse ESR/BVR) */
const MOD10_TABLE = [
  [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
  [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
  [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
  [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
  [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
  [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
  [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
  [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
  [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
  [5, 0, 9, 4, 6, 8, 2, 7, 1, 3],
];

/** Calcule la clé de contrôle (modulo 10 récursif) d'une suite de chiffres */
export function mod10Recursive(digits: string): number {
  let carry = 0;
  for (const char of digits) {
    const digit = Number(char);
    if (Number.isNaN(digit)) continue;
    carry = MOD10_TABLE[carry][digit];
  }
  return (10 - carry) % 10;
}

/** Supprime espaces et séparateurs pour comparer deux références */
export function normalizeReference(reference?: string | null): string {
  if (!reference) return '';
  return reference.replace(/[\s.\-/]/g, '').toUpperCase();
}

/**
 * Génère une référence QR de 27 chiffres.
 *
 * @param seed  Suite de chiffres identifiant la facture (tronquée/complétée à 26)
 * @param prefix Préfixe client (numéro d'adhérent), configurable via QR_REFERENCE_PREFIX
 */
export function buildQrReference(seed: string, prefix = process.env.QR_REFERENCE_PREFIX || ''): string {
  const digitsOnly = `${prefix}${seed}`.replace(/\D/g, '');
  // On conserve les 26 derniers chiffres significatifs, complétés à gauche par des zéros
  const body = digitsOnly.slice(-26).padStart(26, '0');
  return `${body}${mod10Recursive(body)}`;
}

/** Vérifie la clé de contrôle d'une référence QR (27 chiffres) */
export function isValidQrReference(reference?: string | null): boolean {
  const normalized = normalizeReference(reference);
  if (!/^\d{27}$/.test(normalized)) return false;
  return mod10Recursive(normalized.slice(0, 26)) === Number(normalized[26]);
}

/** Vérifie une référence créancier SCOR ISO 11649 (RFxx…) */
export function isValidScorReference(reference?: string | null): boolean {
  const normalized = normalizeReference(reference);
  if (!/^RF\d{2}[0-9A-Z]{1,21}$/.test(normalized)) return false;

  // Règle ISO 7064 MOD 97-10 : on déplace "RFkk" en fin de chaîne
  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));

  let remainder = 0;
  for (const char of numeric) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder === 1;
}

/** Vraie référence structurée (QRR ou SCOR) ? */
export function isStructuredReference(reference?: string | null): boolean {
  return isValidQrReference(reference) || isValidScorReference(reference);
}

/** Mise en forme lisible d'une référence QR : 12 34567 89012 34567 89012 34567 */
export function formatQrReference(reference: string): string {
  const normalized = normalizeReference(reference);
  if (!/^\d{27}$/.test(normalized)) return reference;
  return [
    normalized.slice(0, 2),
    normalized.slice(2, 7),
    normalized.slice(7, 12),
    normalized.slice(12, 17),
    normalized.slice(17, 22),
    normalized.slice(22, 27),
  ].join(' ');
}
