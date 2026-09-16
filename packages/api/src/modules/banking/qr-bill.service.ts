import { SwissQRBill } from 'swissqrbill/pdf';
import type { Data as QrBillData } from 'swissqrbill/types';
import { isQrIban, isStructuredReference, normalizeReference } from './qr-reference';

/**
 * Section paiement de la QR-facture suisse.
 *
 * C'est le carré à scanner, en bas de facture : l'application bancaire du
 * client y lit le bénéficiaire, le montant et surtout la référence, qui n'a
 * plus à être recopiée à la main. C'est ce qui fait la différence entre un
 * rapprochement automatique théorique et un rapprochement automatique réel.
 *
 * Le format est normalisé (Swiss Implementation Guidelines) et la validation
 * est stricte : un QR-IBAN impose une référence QR, un IBAN ordinaire impose
 * une référence SCOR ou aucune. Toute incohérence fait rejeter le virement.
 */

export interface CoordonneesCreancier {
  iban: string;
  nom: string;
  rue: string;
  numero?: string;
  npa: string;
  localite: string;
  pays: string;
}

/** Lit les coordonnées du bénéficiaire dans la configuration */
export function lireCreancier(): CoordonneesCreancier | null {
  const iban = normalizeReference(process.env.COMPANY_IBAN);
  const nom = process.env.COMPANY_NAME?.trim();
  const rue = process.env.COMPANY_STREET?.trim();
  const npa = process.env.COMPANY_POSTAL_CODE?.trim();
  const localite = process.env.COMPANY_CITY?.trim();

  // Une QR-facture sans adresse complète du créancier n'est pas valide :
  // mieux vaut ne pas en produire que d'en produire une que la banque refuse.
  if (!iban || !nom || !rue || !npa || !localite) return null;

  return {
    iban,
    nom,
    rue,
    numero: process.env.COMPANY_BUILDING_NUMBER?.trim() || undefined,
    npa,
    localite,
    pays: process.env.COMPANY_COUNTRY?.trim() || 'CH',
  };
}

/** Raison pour laquelle la section paiement n'a pas pu être produite */
export type MotifAbsence =
  | 'CONFIG_INCOMPLETE'
  | 'REFERENCE_ABSENTE'
  | 'REFERENCE_INCOMPATIBLE'
  | 'ERREUR_VALIDATION';

export interface ResultatQrBill {
  ajoutee: boolean;
  motif?: MotifAbsence;
  detail?: string;
}

interface FactureAPayer {
  montant: number;
  reference?: string | null;
  message?: string;
}

/**
 * Attache la section paiement au document PDF en cours de rédaction.
 *
 * Ne lève jamais : une facture doit pouvoir partir même si la configuration
 * bancaire est incomplète. Le résultat dit si la section a été ajoutée, et
 * sinon pourquoi — l'appelant retombe alors sur les coordonnées en texte.
 */
export function attacherQrBill(doc: PDFKit.PDFDocument, facture: FactureAPayer): ResultatQrBill {
  const creancier = lireCreancier();
  if (!creancier) {
    return { ajoutee: false, motif: 'CONFIG_INCOMPLETE' };
  }

  const reference = normalizeReference(facture.reference);
  const compteEstQrIban = isQrIban(creancier.iban);

  if (!reference) {
    return { ajoutee: false, motif: 'REFERENCE_ABSENTE' };
  }
  if (!isStructuredReference(reference)) {
    return { ajoutee: false, motif: 'REFERENCE_INCOMPATIBLE', detail: 'référence non structurée' };
  }

  // La règle qui fait rejeter les virements mal formés
  const referenceEstQr = /^\d{27}$/.test(reference);
  if (compteEstQrIban !== referenceEstQr) {
    return {
      ajoutee: false,
      motif: 'REFERENCE_INCOMPATIBLE',
      detail: compteEstQrIban
        ? 'un QR-IBAN exige une référence QR à 27 chiffres'
        : 'un IBAN ordinaire exige une référence SCOR (RF…)',
    };
  }

  const donnees: QrBillData = {
    amount: facture.montant,
    creditor: {
      account: creancier.iban,
      address: creancier.rue,
      buildingNumber: creancier.numero,
      city: creancier.localite,
      country: creancier.pays,
      name: creancier.nom,
      zip: creancier.npa,
    },
    currency: 'CHF',
    reference,
    ...(facture.message ? { message: facture.message } : {}),
  };

  // Le débiteur est volontairement omis : le CRM ne stocke l'adresse du client
  // qu'en texte libre, alors que la norme impose des champs séparés (rue,
  // numéro, NPA, localité) depuis l'abandon des adresses combinées. La zone
  // « Payable par » laissée vide est prévue par la norme et se remplit à la
  // main ; une adresse mal découpée, elle, ferait échouer le paiement.

  try {
    // La section paiement s'imprime en noir : c'est une exigence de la norme,
    // et le code doit rester lisible par les scanners. Sans cette remise à
    // zéro, elle hériterait de la couleur laissée active par le document.
    doc.fillColor('black').strokeColor('black');
    new SwissQRBill(donnees, { language: 'FR' }).attachTo(doc);
    return { ajoutee: true };
  } catch (erreur) {
    return {
      ajoutee: false,
      motif: 'ERREUR_VALIDATION',
      detail: erreur instanceof Error ? erreur.message : String(erreur),
    };
  }
}

/** Explication lisible, pour le journal du serveur */
export function expliquerAbsence(resultat: ResultatQrBill): string {
  switch (resultat.motif) {
    case 'CONFIG_INCOMPLETE':
      return 'coordonnées du bénéficiaire incomplètes (COMPANY_IBAN, COMPANY_NAME, COMPANY_STREET, COMPANY_POSTAL_CODE, COMPANY_CITY)';
    case 'REFERENCE_ABSENTE':
      return 'la facture ne porte pas de référence de paiement';
    case 'REFERENCE_INCOMPATIBLE':
      return `référence incompatible avec le compte : ${resultat.detail}`;
    case 'ERREUR_VALIDATION':
      return `refus de la validation ISO 20022 : ${resultat.detail}`;
    default:
      return 'motif inconnu';
  }
}
