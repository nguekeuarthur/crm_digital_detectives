import crypto from 'crypto';
import { ContractStatus, SignatureQuality } from '@prisma/client';
import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import { AuditService } from '../audit/audit.service';
import { FileService } from '../file/file.service';
import { MailService } from '../mail/mail.service';
import {
  connecteurParDefaut,
  obtenirConnecteur,
  qualiteAutorisee,
  qualiteMinimale,
  qualiteParDefaut,
} from './providers';
import { SignatureProviderError } from './signature.types';

/**
 * Circuit de signature électronique d'un contrat (issue #122).
 *
 *   contrat généré → envoi au client → signature chez le prestataire →
 *   retour → archivage du document signé → confirmation au client
 *
 * Le client n'a besoin d'aucun compte : le prestataire lui adresse un lien
 * d'invitation, son identité étant transmise à la création de la demande.
 */

const BASE_URL_PUBLIQUE = () =>
  (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

export class SignatureService {
  /**
   * Envoie un contrat à la signature du client.
   *
   * Refuse d'envoyer deux fois le même contrat : une demande déjà ouverte doit
   * être annulée avant d'en créer une autre, faute de quoi le client recevrait
   * deux liens et signerait un document qui n'est plus celui qu'on suit.
   */
  static async envoyerPourSignature(
    contractId: string,
    options: { qualite?: SignatureQuality; message?: string; userId?: string } = {},
  ) {
    const contrat = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        file: true,
        mandat: { include: { client: true } },
      },
    });

    if (!contrat) throw new ValidationError('Contrat introuvable');
    if (contrat.status === ContractStatus.SIGNED) {
      throw new ValidationError('Ce contrat est déjà signé');
    }
    if (contrat.status === ContractStatus.SENT) {
      throw new ValidationError(
        'Une demande de signature est déjà en cours pour ce contrat. Annulez-la avant d’en envoyer une autre.',
      );
    }

    const client = contrat.mandat.client;
    if (!client.email) {
      throw new ValidationError('Le client n’a pas d’adresse e-mail : impossible de lui envoyer le contrat');
    }

    const kind = connecteurParDefaut();
    const connecteur = obtenirConnecteur(kind);
    const qualite = options.qualite ?? qualiteParDefaut();

    // Le plancher est vérifié ici, et pas seulement à l'entrée HTTP : aucun
    // appelant — route, cron, script — ne doit pouvoir faire signer un contrat
    // à un niveau moins engageant que celui retenu par l'agence.
    if (!qualiteAutorisee(qualite)) {
      throw new ValidationError(
        `Niveau de signature ${qualite} refusé : l'agence exige au minimum ${qualiteMinimale()}.`,
      );
    }

    // Jeton aléatoire : les retours du prestataire ne sont pas signés, c'est
    // lui qui authentifie l'appel. Il est propre à ce contrat et à usage unique.
    const callbackToken = crypto.randomBytes(24).toString('hex');
    const racine = `${BASE_URL_PUBLIQUE()}/api/v1/webhooks/signature/${callbackToken}`;

    const document = await FileService.getFileBuffer(contrat.fileId);

    let demande;
    try {
      demande = await connecteur.creerDemande({
        titre: `Contrat — ${contrat.mandat.title}`,
        message:
          options.message ??
          `Bonjour ${client.firstName},\n\nVeuillez trouver ci-joint votre contrat à signer électroniquement.`,
        document,
        nomDocument: contrat.file.name,
        signataire: {
          email: client.email,
          prenom: client.firstName,
          nom: client.lastName,
          langue: 'fr',
          mobile: client.phone,
        },
        qualite,
        urlRetourSucces: `${racine}?evenement=signe`,
        urlRetourErreur: `${racine}?evenement=erreur`,
      });
    } catch (erreur) {
      const motif = erreur instanceof Error ? erreur.message : String(erreur);
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.ERROR, lastError: motif },
      });
      throw erreur;
    }

    const misAJour = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.SENT,
        signatureProvider: kind,
        signatureRequestId: demande.identifiant,
        signatureQuality: qualite,
        callbackToken,
        signerEmail: client.email,
        sentForSignatureAt: new Date(),
        lastError: null,
      },
    });

    await AuditService.log({
      userId: options.userId,
      action: 'CONTRACT_SENT_FOR_SIGNATURE',
      entity: 'Contract',
      entityId: contractId,
      newValue: { provider: kind, qualite, signataire: client.email },
    });

    console.log(
      `🖊️  Contrat ${contractId} envoyé à ${client.email} via ${connecteur.nom} (${qualite})`,
    );

    return { contrat: misAJour, lienSignature: demande.lienSignature };
  }

  /**
   * Traite un retour du prestataire, identifié par son jeton.
   *
   * Volontairement idempotent : les prestataires réémettent leurs appels, et un
   * contrat déjà archivé ne doit pas l'être une seconde fois.
   */
  static async traiterRetour(callbackToken: string) {
    const contrat = await prisma.contract.findUnique({
      where: { callbackToken },
      include: { mandat: { include: { client: true } }, file: true },
    });

    if (!contrat) throw new ValidationError('Jeton de retour inconnu');

    // Les prestataires réémettent leurs appels : sur un contrat déjà arrivé à
    // son terme, on ne refait rien — ni téléchargement, ni archivage, ni envoi.
    const ETATS_TERMINAUX: ContractStatus[] = [
      ContractStatus.SIGNED,
      ContractStatus.DECLINED,
      ContractStatus.WITHDRAWN,
    ];
    if (ETATS_TERMINAUX.includes(contrat.status)) {
      return { deja: true, contrat };
    }
    if (!contrat.signatureRequestId || !contrat.signatureProvider) {
      throw new ValidationError('Ce contrat n’a pas de demande de signature en cours');
    }

    // On ne se fie pas au contenu de l'appel : on interroge le prestataire.
    // C'est ce qui empêche qu'un appel forgé fasse basculer un contrat en signé.
    const connecteur = obtenirConnecteur(contrat.signatureProvider);
    const statut = await connecteur.consulterDemande(contrat.signatureRequestId);

    if (statut.etat === 'EN_ATTENTE') {
      return { deja: false, contrat, ignore: true };
    }

    if (statut.etat === 'REFUSEE' || statut.etat === 'ANNULEE') {
      const misAJour = await prisma.contract.update({
        where: { id: contrat.id },
        data: {
          status: statut.etat === 'REFUSEE' ? ContractStatus.DECLINED : ContractStatus.WITHDRAWN,
          declinedAt: new Date(),
        },
      });
      await AuditService.log({
        action: statut.etat === 'REFUSEE' ? 'CONTRACT_SIGNATURE_DECLINED' : 'CONTRACT_SIGNATURE_WITHDRAWN',
        entity: 'Contract',
        entityId: contrat.id,
      });
      return { deja: false, contrat: misAJour };
    }

    // ─── Signé : archivage puis confirmation ────────────────────────────────

    // Le webhook et le cron de rattrapage peuvent traiter le même contrat au
    // même instant. On le « prend » par une écriture conditionnelle : un seul
    // des deux voit count === 1 et poursuit, l'autre s'arrête ici. Sans cela,
    // le document serait archivé deux fois et le client recevrait deux envois.
    const prise = await prisma.contract.updateMany({
      where: { id: contrat.id, status: ContractStatus.SENT },
      data: { status: ContractStatus.SIGNED, signedAt: statut.signeeLe ?? new Date() },
    });
    if (prise.count === 0) {
      const dejaTraite = await prisma.contract.findUnique({ where: { id: contrat.id } });
      return { deja: true, contrat: dejaTraite ?? contrat };
    }

    let documentSigne;
    try {
      const identifiantDocument = statut.identifiantDocument ?? contrat.signatureRequestId;
      documentSigne = await connecteur.telechargerDocumentSigne(identifiantDocument);
    } catch (erreur) {
      // L'archivage a échoué après la prise : on rend le contrat au circuit
      // pour que le rattrapage horaire réessaie, en gardant trace du motif.
      const motif = erreur instanceof Error ? erreur.message : String(erreur);
      await prisma.contract.update({
        where: { id: contrat.id },
        data: { status: ContractStatus.SENT, signedAt: null, lastError: `Archivage : ${motif}` },
      });
      throw erreur;
    }

    let fichier;
    try {
      fichier = await FileService.uploadFile({
        name: this.nommerDocumentSigne(contrat.file.name),
        buffer: documentSigne,
        mimeType: 'application/pdf',
        size: documentSigne.length,
        folderId: contrat.file.folderId,
        userId: null,
      });
    } catch (erreur) {
      const motif = erreur instanceof Error ? erreur.message : String(erreur);
      await prisma.contract.update({
        where: { id: contrat.id },
        data: { status: ContractStatus.SENT, signedAt: null, lastError: `Archivage : ${motif}` },
      });
      throw erreur;
    }

    const misAJour = await prisma.contract.update({
      where: { id: contrat.id },
      data: { signedFileId: fichier.id, lastError: null },
    });

    await AuditService.log({
      action: 'CONTRACT_SIGNED',
      entity: 'Contract',
      entityId: contrat.id,
      newValue: { signedFileId: fichier.id, provider: contrat.signatureProvider },
    });

    await this.envoyerConfirmation(contrat, documentSigne, contrat.signerEmail);

    console.log(`✅ Contrat ${contrat.id} signé et archivé (${fichier.name})`);
    return { deja: false, contrat: misAJour };
  }

  /** Retire une demande encore ouverte */
  static async annuler(contractId: string, userId?: string) {
    const contrat = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contrat) throw new ValidationError('Contrat introuvable');
    if (contrat.status !== ContractStatus.SENT) {
      throw new ValidationError('Aucune demande de signature en cours pour ce contrat');
    }

    if (contrat.signatureRequestId && contrat.signatureProvider) {
      try {
        await obtenirConnecteur(contrat.signatureProvider).annulerDemande(contrat.signatureRequestId);
      } catch (erreur) {
        // La demande peut avoir déjà disparu côté prestataire : on poursuit,
        // l'état du CRM doit pouvoir être rétabli dans tous les cas.
        console.warn(
          `[Signature] Annulation côté prestataire impossible : ${erreur instanceof Error ? erreur.message : erreur}`,
        );
      }
    }

    const misAJour = await prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.WITHDRAWN, callbackToken: null },
    });

    await AuditService.log({
      userId,
      action: 'CONTRACT_SIGNATURE_WITHDRAWN',
      entity: 'Contract',
      entityId: contractId,
    });

    return misAJour;
  }

  /**
   * Rattrape les demandes dont le retour ne serait jamais arrivé.
   * Appelée par le cron : un appel perdu ne doit pas laisser un contrat
   * indéfiniment « en attente » alors que le client a signé.
   */
  static async rafraichirDemandesOuvertes() {
    const enCours = await prisma.contract.findMany({
      where: { status: ContractStatus.SENT, signatureRequestId: { not: null } },
      select: { id: true, callbackToken: true },
    });

    let aboutis = 0;
    const erreurs: string[] = [];

    for (const contrat of enCours) {
      if (!contrat.callbackToken) continue;
      try {
        const resultat = await this.traiterRetour(contrat.callbackToken);
        if (!resultat.ignore && !resultat.deja) aboutis += 1;
      } catch (erreur) {
        erreurs.push(`${contrat.id} : ${erreur instanceof Error ? erreur.message : erreur}`);
      }
    }

    return { examines: enCours.length, aboutis, erreurs };
  }

  // ─── Utilitaires ──────────────────────────────────────────────────────────

  private static nommerDocumentSigne(nomOriginal: string): string {
    const base = nomOriginal.replace(/\.pdf$/i, '');
    return `${base}_signe.pdf`;
  }

  private static async envoyerConfirmation(
    contrat: { id: string; mandatId: string; mandat: { title: string; client: { id: string; email: string; firstName: string; lastName: string } } },
    documentSigne: Buffer,
    destinataireFige?: string | null,
  ) {
    const client = contrat.mandat.client;
    // L'exemplaire signé part à l'adresse à laquelle la demande a été envoyée,
    // pas à l'adresse courante : un changement de fiche entre-temps enverrait
    // le contrat ailleurs qu'à son signataire.
    const destinataire = destinataireFige || client.email;
    try {
      await MailService.sendMail({
        to: destinataire,
        subject: `Votre contrat signé — ${contrat.mandat.title} | Digitaldetectives`,
        html: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour ${client.firstName},</h2>
    <p>Nous vous confirmons la signature de votre contrat pour le mandat <strong>«&nbsp;${contrat.mandat.title}&nbsp;»</strong>.</p>
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #166534;">✅ Contrat signé</p>
    </div>
    <p>Vous trouverez l'exemplaire signé en pièce jointe. Conservez-le : il fait foi.</p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
        clientId: client.id,
        mandatId: contrat.mandatId,
        attachments: [
          {
            filename: 'Contrat_signe.pdf',
            content: documentSigne,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (erreur) {
      // Le contrat est signé et archivé : un e-mail qui ne part pas ne doit
      // pas défaire cela. On journalise et on laisse l'opérateur renvoyer.
      console.error(
        `[Signature] Confirmation non envoyée pour le contrat ${contrat.id} :`,
        erreur instanceof Error ? erreur.message : erreur,
      );
    }
  }
}

export { SignatureProviderError };
