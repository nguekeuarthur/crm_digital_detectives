/**
 * Utilitaires de comparaison textuelle utilisés par le moteur de rapprochement.
 *
 * Les libellés bancaires sont bruités : majuscules, accents perdus, nom de
 * société tronqué, ordre prénom/nom inversé. On normalise puis on combine une
 * distance de Levenshtein et un recouvrement de mots.
 */

/** Minuscules, sans accents ni ponctuation, espaces normalisés */
export function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Chaîne réduite aux caractères alphanumériques (pour chercher une référence dans un libellé) */
export function compactAlphanumeric(value?: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Distance d'édition de Levenshtein */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 0; i < a.length; i++) {
    const current = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,        // insertion
        previous[j + 1] + 1,   // suppression
        previous[j] + cost,    // substitution
      );
    }
    previous = current;
  }

  return previous[b.length];
}

/** Similarité 0 → 1 basée sur la distance d'édition */
function editSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLength = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLength;
}

/**
 * Similarité de deux noms (personne ou société).
 * Combine le recouvrement de mots (robuste à l'inversion prénom/nom) et la
 * similarité d'édition (robuste aux fautes de frappe).
 */
export function nameSimilarity(a?: string | null, b?: string | null): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = left.split(' ').filter((token) => token.length > 1);
  const rightTokens = right.split(' ').filter((token) => token.length > 1);
  if (!leftTokens.length || !rightTokens.length) return editSimilarity(left, right);

  // Un mot compte comme commun s'il a un équivalent proche dans l'autre libellé
  let matched = 0;
  for (const token of leftTokens) {
    const best = Math.max(...rightTokens.map((other) => editSimilarity(token, other)));
    if (best >= 0.85) matched += 1;
  }

  const overlap = matched / Math.min(leftTokens.length, rightTokens.length);
  return Math.max(overlap * 0.9 + editSimilarity(left, right) * 0.1, editSimilarity(left, right));
}

/** Le libellé bancaire contient-il la référence recherchée ? (comparaison alphanumérique) */
export function containsReference(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const compactNeedle = compactAlphanumeric(needle);
  if (compactNeedle.length < 4) return false;
  return compactAlphanumeric(haystack).includes(compactNeedle);
}
