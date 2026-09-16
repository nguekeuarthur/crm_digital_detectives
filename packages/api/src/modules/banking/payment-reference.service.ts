import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { buildQrReference } from './qr-reference';

/**
 * Attribution des références de paiement suisses aux factures.
 *
 * Ce module est volontairement une feuille de l'arbre de dépendances : il ne
 * connaît que Prisma et le calcul de référence. C'est ce qui permet à
 * BillingService de l'utiliser au moment d'émettre une facture sans créer de
 * cycle avec BankingService (qui, lui, dépend de BillingService via le
 * rapprochement).
 */

/**
 * Attribue (si absente) une référence QR à une facture. C'est cette référence,
 * imprimée sur la facture, qui permet à la banque de la restituer dans le
 * camt.053 et donc d'atteindre un rapprochement automatique fiable.
 */
export async function ensureInvoicePaymentReference(invoiceId: string): Promise<string> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new ValidationError('Facture introuvable');
  if (invoice.paymentReference) return invoice.paymentReference;

  // Base numérique dérivée de l'identifiant de facture (stable et unique)
  const seed = BigInt(`0x${invoice.id.replace(/-/g, '').slice(0, 15)}`).toString().slice(0, 20);
  let reference = buildQrReference(seed);

  // Garde-fou anti-collision (probabilité négligeable, coût nul)
  for (let attempt = 1; attempt <= 5; attempt++) {
    const clash = await prisma.invoice.findUnique({ where: { paymentReference: reference } });
    if (!clash) break;
    reference = buildQrReference(`${seed}${attempt}`);
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { paymentReference: reference } });
  return reference;
}
