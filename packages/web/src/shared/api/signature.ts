import { api } from './base';

export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'WITHDRAWN' | 'ERROR';
export type SignatureQuality = 'SES' | 'AES' | 'QES';
export type SignatureProviderKind = 'SKRIBBLE' | 'MOCK';

export interface ContractSuivi {
  id: string;
  mandatId: string;
  generatedAt: string;
  status: ContractStatus;
  signatureProvider?: SignatureProviderKind | null;
  signatureQuality?: SignatureQuality | null;
  signerEmail?: string | null;
  sentForSignatureAt?: string | null;
  signedAt?: string | null;
  declinedAt?: string | null;
  lastError?: string | null;
  signedFileId?: string | null;
  file: { id: string; name: string };
  signedFile?: { id: string; name: string } | null;
  template?: { name: string } | null;
  mandat: {
    title: string;
    client: { firstName: string; lastName: string; company?: string | null; email: string };
  };
}

export interface SignatureStats {
  total: number;
  brouillon: number;
  enAttente: number;
  signes: number;
  refuses: number;
  annules: number;
  enErreur: number;
  connecteur: SignatureProviderKind;
  qualite: SignatureQuality;
  qualiteMinimale: SignatureQuality;
}

export class SignatureApi {
  static async listerContrats(params: {
    statut?: ContractStatus;
    mandatId?: string;
    recherche?: string;
    page?: number;
    limite?: number;
  }): Promise<{ items: ContractSuivi[]; total: number; page: number; pages: number }> {
    const { data } = await api.get('/contracts', { params });
    return data;
  }

  static async statistiques(): Promise<SignatureStats> {
    const { data } = await api.get('/contracts/signature-stats');
    return data;
  }

  static async envoyerPourSignature(
    contractId: string,
    payload: { qualite?: SignatureQuality; message?: string } = {},
  ): Promise<{ contrat: ContractSuivi; lienSignature?: string; message: string }> {
    const { data } = await api.post(`/contracts/${contractId}/send-for-signature`, payload);
    return data;
  }

  static async annuler(contractId: string): Promise<{ contrat: ContractSuivi; message: string }> {
    const { data } = await api.post(`/contracts/${contractId}/withdraw-signature`);
    return data;
  }

  /** Mise au point seulement : disponible lorsque le connecteur est en simulation */
  static async simuler(
    contractId: string,
    issue: 'signe' | 'refuse',
  ): Promise<{ contrat: ContractSuivi; message: string }> {
    const { data } = await api.post(`/contracts/${contractId}/simulate-signature`, { issue });
    return data;
  }
}

/**
 * Libellés courts : ils doivent tenir dans un badge de tableau. L'explication
 * complète passe par `detail`, affiché en infobulle.
 */
export const STATUT_CONTRAT: Record<ContractStatus, { label: string; couleur: string; detail: string }> = {
  DRAFT: { label: 'À envoyer', couleur: 'gray', detail: 'Contrat généré, pas encore envoyé au client' },
  SENT: { label: 'En attente', couleur: 'blue', detail: 'Envoyé au client, en attente de sa signature' },
  SIGNED: { label: 'Signé', couleur: 'green', detail: 'Signé par le client, document archivé' },
  DECLINED: { label: 'Refusé', couleur: 'red', detail: 'Le client a refusé de signer' },
  WITHDRAWN: { label: 'Annulé', couleur: 'orange', detail: 'Demande retirée depuis le CRM' },
  ERROR: { label: 'Erreur', couleur: 'red', detail: 'Échec technique chez le prestataire' },
};

export const QUALITE_LABELS: Record<SignatureQuality, { court: string; long: string }> = {
  SES: { court: 'Simple', long: 'Signature simple — aucune vérification d’identité' },
  AES: { court: 'Avancée', long: 'Signature avancée — identité vérifiée' },
  QES: { court: 'Qualifiée', long: 'Signature qualifiée — équivaut à une signature manuscrite' },
};
