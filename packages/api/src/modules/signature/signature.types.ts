import { SignatureQuality } from '@prisma/client';

/**
 * Contrat que doit remplir un prestataire de signature électronique.
 *
 * L'interface est volontairement réduite à ce dont le CRM a besoin : envoyer un
 * PDF à signer, connaître l'état d'une demande, récupérer le document signé et
 * annuler. Elle permet de développer contre une simulation locale, puis de
 * basculer sur Skribble sans toucher au reste du code.
 */

export interface Signataire {
  email: string;
  prenom: string;
  nom: string;
  /** Langue de l'invitation envoyée par le prestataire */
  langue?: 'fr' | 'de' | 'it' | 'en';
  /** Requis par certains prestataires pour la signature qualifiée (SMS) */
  mobile?: string | null;
}

export interface DemandeSignature {
  titre: string;
  message: string;
  /** Le PDF à faire signer */
  document: Buffer;
  nomDocument: string;
  signataire: Signataire;
  qualite: SignatureQuality;
  /** URL appelée par le prestataire une fois toutes les signatures apposées */
  urlRetourSucces: string;
  /** URL appelée si la demande échoue ou est refusée */
  urlRetourErreur: string;
}

export interface DemandeCreee {
  /** Identifiant de la demande chez le prestataire */
  identifiant: string;
  /** Lien de signature, quand le prestataire le restitue à la création */
  lienSignature?: string;
}

export type EtatDemande = 'EN_ATTENTE' | 'SIGNEE' | 'REFUSEE' | 'ANNULEE';

export interface StatutDemande {
  etat: EtatDemande;
  /** Identifiant du document signé, à passer à telechargerDocumentSigne() */
  identifiantDocument?: string;
  signeeLe?: Date;
}

export interface SignatureProviderPort {
  /** Nom du connecteur, pour les journaux */
  readonly nom: string;

  /** Crée la demande et déclenche l'invitation du signataire */
  creerDemande(demande: DemandeSignature): Promise<DemandeCreee>;

  /** État courant d'une demande */
  consulterDemande(identifiant: string): Promise<StatutDemande>;

  /** Récupère le PDF signé, avec ses preuves de signature */
  telechargerDocumentSigne(identifiantDocument: string): Promise<Buffer>;

  /** Retire une demande encore ouverte */
  annulerDemande(identifiant: string): Promise<void>;
}

/** Erreur imputable au prestataire, distinguée d'une erreur de saisie */
export class SignatureProviderError extends Error {
  constructor(
    message: string,
    readonly statut?: number,
  ) {
    super(message);
    this.name = 'SignatureProviderError';
  }
}
