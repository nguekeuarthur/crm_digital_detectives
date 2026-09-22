import { SignatureQuality } from '@prisma/client';
import {
  DemandeCreee,
  DemandeSignature,
  SignatureProviderError,
  SignatureProviderPort,
  StatutDemande,
} from '../signature.types';

/**
 * Connecteur Skribble — signature électronique suisse.
 *
 * Skribble est l'une des rares plates-formes à porter nativement la SCSE
 * (ZertES) et pas seulement eIDAS : c'est ce qui donne à la signature
 * qualifiée sa valeur de signature manuscrite en droit suisse
 * (art. 14 al. 2bis CO).
 *
 * Prérequis : un abonnement Skribble Business (l'API n'est pas incluse dans
 * les offres inférieures), un nom d'utilisateur d'API et sa clé.
 *
 * Authentification : POST /v2/access/login rend un jeton JWT, présenté ensuite
 * en Bearer. Le jeton est mis en cache jusqu'à peu avant son expiration.
 *
 * Retours : Skribble n'émet pas de webhook signé cryptographiquement mais
 * appelle des URL fournies à la création. C'est la raison pour laquelle le CRM
 * place un jeton aléatoire dans ces URL — sans lui, n'importe qui pourrait
 * déclarer un contrat signé.
 */

const BASE_URL_DEFAUT = 'https://api.skribble.com/v2';

// Sans plafond, un prestataire qui ne répond plus bloquerait le rattrapage
// horaire, dont les exécutions finiraient par se superposer.
const DELAI_MS = Number(process.env.SKRIBBLE_TIMEOUT_MS || 30_000);

/** Correspondance entre nos niveaux et le champ `quality` de Skribble */
const QUALITE_SKRIBBLE: Record<SignatureQuality, string> = {
  SES: 'SES',
  AES: 'AES',
  QES: 'QES',
};

interface ReponseDemande {
  id: string;
  status_overall?: string;
  signing_url?: string;
  document_id?: string;
  updated_at?: string;
  signatures?: Array<{ status_code?: string; signed_at?: string }>;
}

export class SkribbleProvider implements SignatureProviderPort {
  readonly nom = 'Skribble';

  private jeton: string | null = null;
  private jetonExpireLe = 0;

  private get baseUrl(): string {
    return (process.env.SKRIBBLE_API_BASE_URL || BASE_URL_DEFAUT).replace(/\/$/, '');
  }

  /** Vérifie que le connecteur est utilisable avant d'engager quoi que ce soit */
  static estConfigure(): boolean {
    return Boolean(process.env.SKRIBBLE_API_USERNAME && process.env.SKRIBBLE_API_KEY);
  }

  // ─── Authentification ─────────────────────────────────────────────────────

  private async obtenirJeton(): Promise<string> {
    if (this.jeton && Date.now() < this.jetonExpireLe) return this.jeton;

    const username = process.env.SKRIBBLE_API_USERNAME;
    const key = process.env.SKRIBBLE_API_KEY;
    if (!username || !key) {
      throw new SignatureProviderError(
        'Skribble non configuré : SKRIBBLE_API_USERNAME et SKRIBBLE_API_KEY sont requis',
      );
    }

    const reponse = await fetch(`${this.baseUrl}/access/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, 'api-key': key }),
      signal: AbortSignal.timeout(DELAI_MS),
    });

    if (!reponse.ok) {
      throw new SignatureProviderError(
        `Authentification Skribble refusée : ${await this.lireErreur(reponse)}`,
        reponse.status,
      );
    }

    // La réponse est le JWT brut (texte), pas un objet JSON
    const jeton = (await reponse.text()).trim().replace(/^"|"$/g, '');
    if (!jeton || jeton.length < 20) {
      throw new SignatureProviderError('Skribble a renvoyé un jeton vide ou inattendu');
    }
    this.jeton = jeton;
    // Les jetons valent une heure ; on garde une marge de sécurité
    this.jetonExpireLe = Date.now() + 50 * 60 * 1000;
    return this.jeton;
  }

  private async appeler<T>(
    chemin: string,
    options: { method?: string; corps?: unknown; brut?: boolean } = {},
  ): Promise<T> {
    const jeton = await this.obtenirJeton();
    const reponse = await fetch(`${this.baseUrl}${chemin}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${jeton}`,
        ...(options.corps ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.corps ? { body: JSON.stringify(options.corps) } : {}),
      signal: AbortSignal.timeout(DELAI_MS),
    });

    if (!reponse.ok) {
      // Un jeton refusé peut être un jeton expiré : on vide le cache pour que
      // la tentative suivante se réauthentifie au lieu de boucler sur un 401.
      if (reponse.status === 401 || reponse.status === 403) {
        this.jeton = null;
        this.jetonExpireLe = 0;
      }
      throw new SignatureProviderError(
        `Skribble ${options.method ?? 'GET'} ${chemin} : ${await this.lireErreur(reponse)}`,
        reponse.status,
      );
    }

    if (options.brut) {
      return Buffer.from(await reponse.arrayBuffer()) as unknown as T;
    }
    return (await reponse.json()) as T;
  }

  private async lireErreur(reponse: Response): Promise<string> {
    const texte = await reponse.text().catch(() => '');
    return `${reponse.status} ${reponse.statusText}${texte ? ` — ${texte.slice(0, 300)}` : ''}`;
  }

  // ─── Opérations ───────────────────────────────────────────────────────────

  async creerDemande(demande: DemandeSignature): Promise<DemandeCreee> {
    const corps = {
      title: demande.titre,
      message: demande.message,
      content: demande.document.toString('base64'),
      file_name: demande.nomDocument,
      // Le signataire n'a pas besoin d'un compte Skribble : son identité est
      // fournie ici, il reçoit une invitation par courriel.
      signatures: [
        {
          account_email: demande.signataire.email,
          signer_identity_data: {
            email_address: demande.signataire.email,
            first_name: demande.signataire.prenom,
            last_name: demande.signataire.nom,
            language: demande.signataire.langue ?? 'fr',
            ...(demande.signataire.mobile ? { mobile_number: demande.signataire.mobile } : {}),
          },
        },
      ],
      quality: QUALITE_SKRIBBLE[demande.qualite],
      // Signature qualifiée au sens du droit suisse, pas du règlement européen
      legislation: 'ZERTES',
      notify_signers: true,
      callback_success_url: demande.urlRetourSucces,
      callback_error_url: demande.urlRetourErreur,
    };

    const reponse = await this.appeler<ReponseDemande>('/signature-requests', {
      method: 'POST',
      corps,
    });

    if (!reponse?.id) {
      throw new SignatureProviderError('Skribble n’a pas renvoyé d’identifiant de demande');
    }

    return { identifiant: reponse.id, lienSignature: reponse.signing_url };
  }

  async consulterDemande(identifiant: string): Promise<StatutDemande> {
    const reponse = await this.appeler<ReponseDemande>(
      `/signature-requests/${encodeURIComponent(identifiant)}`,
    );

    const etatBrut = (reponse.status_overall || '').toUpperCase();
    let etat: StatutDemande['etat'];
    if (etatBrut === 'SIGNED') etat = 'SIGNEE';
    else if (etatBrut === 'WITHDRAWN') etat = 'ANNULEE';
    else if (etatBrut === 'DECLINED') etat = 'REFUSEE';
    else {
      etat = 'EN_ATTENTE';
      // Un état inconnu traité en silence laisserait le contrat interrogé
      // toutes les heures sans fin et sans trace.
      if (etatBrut && etatBrut !== 'OPEN') {
        console.warn(
          `[Skribble] État inattendu « ${etatBrut} » pour la demande ${identifiant} — traité comme « en attente »`,
        );
      }
    }

    const signeeLe = reponse.signatures?.find((s) => s.signed_at)?.signed_at;

    return {
      etat,
      identifiantDocument: reponse.document_id,
      signeeLe: signeeLe ? new Date(signeeLe) : undefined,
    };
  }

  async telechargerDocumentSigne(identifiantDocument: string): Promise<Buffer> {
    return this.appeler<Buffer>(
      `/documents/${encodeURIComponent(identifiantDocument)}/content`,
      { brut: true },
    );
  }

  async annulerDemande(identifiant: string): Promise<void> {
    await this.appeler(`/signature-requests/${encodeURIComponent(identifiant)}`, {
      method: 'DELETE',
    });
  }
}
