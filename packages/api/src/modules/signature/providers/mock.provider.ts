import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  DemandeCreee,
  DemandeSignature,
  SignatureProviderError,
  SignatureProviderPort,
  StatutDemande,
} from '../signature.types';

/**
 * Connecteur de simulation.
 *
 * Rejoue le cycle complet d'une demande de signature sans appeler Skribble ni
 * consommer l'essai de 14 jours : la demande reste ouverte jusqu'à ce que
 * quelqu'un la fasse aboutir depuis l'écran de suivi ou par la route de
 * simulation, ce qui permet d'exercer aussi bien le retour « signé » que le
 * retour « refusé ».
 *
 * Le document rendu est le PDF d'origine, auquel une page de garde indique en
 * toutes lettres qu'il s'agit d'une simulation — pour qu'aucun document produit
 * ici ne puisse être pris pour un contrat réellement signé.
 */

interface DemandeSimulee {
  identifiant: string;
  document: Buffer;
  nomDocument: string;
  signataire: DemandeSignature['signataire'];
  qualite: DemandeSignature['qualite'];
  etat: StatutDemande['etat'];
  signeeLe?: Date;
  creeeLe: Date;
}

/** Les demandes vivent en mémoire : le processus redémarre, elles disparaissent */
const DEMANDES = new Map<string, DemandeSimulee>();

export class MockProvider implements SignatureProviderPort {
  readonly nom = 'Simulation';

  async creerDemande(demande: DemandeSignature): Promise<DemandeCreee> {
    const identifiant = `sim_${crypto.randomBytes(9).toString('hex')}`;

    DEMANDES.set(identifiant, {
      identifiant,
      document: demande.document,
      nomDocument: demande.nomDocument,
      signataire: demande.signataire,
      qualite: demande.qualite,
      etat: 'EN_ATTENTE',
      creeeLe: new Date(),
    });

    console.log(
      `🖊️  [Simulation] Demande ${identifiant} pour ${demande.signataire.email} ` +
        `(${demande.qualite}) — à faire aboutir depuis l'écran de suivi`,
    );

    return { identifiant, lienSignature: `${demande.urlRetourSucces}&simulation=1` };
  }

  async consulterDemande(identifiant: string): Promise<StatutDemande> {
    const demande = this.recuperer(identifiant);
    return {
      etat: demande.etat,
      identifiantDocument: demande.etat === 'SIGNEE' ? identifiant : undefined,
      signeeLe: demande.signeeLe,
    };
  }

  async telechargerDocumentSigne(identifiantDocument: string): Promise<Buffer> {
    const demande = this.recuperer(identifiantDocument);
    if (demande.etat !== 'SIGNEE') {
      throw new SignatureProviderError('La demande simulée n’est pas signée');
    }
    return this.apposerMentionSimulation(demande);
  }

  async annulerDemande(identifiant: string): Promise<void> {
    const demande = this.recuperer(identifiant);
    demande.etat = 'ANNULEE';
  }

  // ─── Pilotage de la simulation ────────────────────────────────────────────

  /** Fait aboutir une demande simulée, comme si le client avait signé */
  static faireSigner(identifiant: string): void {
    const demande = DEMANDES.get(identifiant);
    if (!demande) throw new SignatureProviderError('Demande simulée introuvable');
    if (demande.etat !== 'EN_ATTENTE') {
      throw new SignatureProviderError(`La demande est déjà à l'état ${demande.etat}`);
    }
    demande.etat = 'SIGNEE';
    demande.signeeLe = new Date();
  }

  /** Fait refuser une demande simulée */
  static faireRefuser(identifiant: string): void {
    const demande = DEMANDES.get(identifiant);
    if (!demande) throw new SignatureProviderError('Demande simulée introuvable');
    demande.etat = 'REFUSEE';
  }

  /** Vide les demandes en mémoire (utilisé par les essais) */
  static reinitialiser(): void {
    DEMANDES.clear();
  }

  private recuperer(identifiant: string): DemandeSimulee {
    const demande = DEMANDES.get(identifiant);
    if (!demande) {
      throw new SignatureProviderError(
        `Demande simulée ${identifiant} introuvable (le serveur a-t-il redémarré ?)`,
      );
    }
    return demande;
  }

  /**
   * Ajoute une page de garde très visible. Un document de simulation ne doit
   * jamais pouvoir être confondu avec un contrat signé.
   */
  private async apposerMentionSimulation(demande: DemandeSimulee): Promise<Buffer> {
    const pdf = await PDFDocument.load(demande.document);
    const police = await pdf.embedFont(StandardFonts.HelveticaBold);
    const normale = await pdf.embedFont(StandardFonts.Helvetica);

    const page = pdf.insertPage(0);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 40,
      y: height / 2 - 130,
      width: width - 80,
      height: 260,
      borderColor: rgb(0.7, 0.1, 0.1),
      borderWidth: 2,
    });

    page.drawText('DOCUMENT DE SIMULATION', {
      x: 70,
      y: height / 2 + 80,
      size: 22,
      font: police,
      color: rgb(0.7, 0.1, 0.1),
    });

    const lignes = [
      "Ce document n'a AUCUNE valeur juridique.",
      '',
      "Il a été produit par le connecteur de simulation du CRM, afin de",
      "mettre au point le circuit de signature sans appeler de prestataire.",
      '',
      `Demande      : ${demande.identifiant}`,
      `Signataire   : ${demande.signataire.prenom} ${demande.signataire.nom} <${demande.signataire.email}>`,
      `Niveau simulé: ${demande.qualite}`,
      `Horodatage   : ${(demande.signeeLe ?? new Date()).toLocaleString('fr-CH')}`,
    ];

    lignes.forEach((ligne, index) => {
      page.drawText(ligne, {
        x: 70,
        y: height / 2 + 40 - index * 16,
        size: 10,
        font: normale,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    return Buffer.from(await pdf.save());
  }
}
