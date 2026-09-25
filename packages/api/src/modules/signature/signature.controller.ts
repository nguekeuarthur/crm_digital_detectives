import { Request, Response } from 'express';
import { z } from 'zod';
import { ContractStatus, SignatureQuality } from '@prisma/client';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { ValidationError } from '../../shared/errors';
import { SignatureService } from './signature.service';
import { connecteurParDefaut, MockProvider } from './providers';

/**
 * Le callbackToken authentifie à lui seul la route webhook publique : il ne
 * doit jamais quitter le serveur. Les objets Prisma sont renvoyés tels quels
 * par les routes, d'où cet assainissement systématique.
 */
function sansSecret<T extends { callbackToken?: string | null }>(contrat: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { callbackToken, ...reste } = contrat;
  return reste;
}

const envoiSchema = z.object({
  qualite: z.nativeEnum(SignatureQuality).optional(),
  message: z.string().max(2000).optional(),
});

const simulationSchema = z.object({
  issue: z.enum(['signe', 'refuse']).default('signe'),
});

const listeSchema = z.object({
  statut: z.nativeEnum(ContractStatus).optional(),
  mandatId: z.string().optional(),
  recherche: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
});

export class SignatureController {
  /** GET /contracts — suivi des contrats et de leur signature */
  static async lister(req: AuthRequest, res: Response) {
    const filtres = listeSchema.parse(req.query ?? {});
    const resultat = await SignatureService.listerContrats({
      ...filtres,
      utilisateur: req.user,
    });
    res.json(resultat);
  }

  /** GET /contracts/signature-stats */
  static async statistiques(req: AuthRequest, res: Response) {
    res.json(await SignatureService.statistiques(req.user));
  }

  /** POST /contracts/:id/send-for-signature */
  static async envoyerPourSignature(req: AuthRequest, res: Response) {
    const { qualite, message } = envoiSchema.parse(req.body ?? {});
    const resultat = await SignatureService.envoyerPourSignature(req.params.id as string, {
      qualite,
      message,
      userId: req.user?.userId,
    });
    res.json({
      contrat: sansSecret(resultat.contrat),
      lienSignature: resultat.lienSignature,
      message: 'Contrat envoyé au client pour signature',
    });
  }

  /** POST /contracts/:id/withdraw-signature */
  static async annuler(req: AuthRequest, res: Response) {
    const contrat = await SignatureService.annuler(req.params.id as string, req.user?.userId);
    res.json({ contrat: sansSecret(contrat), message: 'Demande de signature annulée' });
  }

  /** POST /contracts/:id/simulate-signature — mise au point uniquement */
  static async simuler(req: AuthRequest, res: Response) {
    if (connecteurParDefaut() !== 'MOCK') {
      throw new ValidationError(
        'La simulation n’est disponible que lorsque SIGNATURE_PROVIDER vaut MOCK',
      );
    }

    const { issue } = simulationSchema.parse(req.body ?? {});
    const { prisma } = await import('../../shared/prisma');
    const contrat = await prisma.contract.findUnique({ where: { id: req.params.id as string } });

    if (!contrat?.signatureRequestId || !contrat.callbackToken) {
      throw new ValidationError('Ce contrat n’a pas de demande de signature en cours');
    }

    if (issue === 'signe') MockProvider.faireSigner(contrat.signatureRequestId);
    else MockProvider.faireRefuser(contrat.signatureRequestId);

    const resultat = await SignatureService.traiterRetour(contrat.callbackToken);
    res.json({ contrat: sansSecret(resultat.contrat), message: `Signature simulée : ${issue}` });
  }

  /**
   * GET|POST /webhooks/signature/:token — retour du prestataire.
   *
   * Route publique : le jeton de l'URL fait l'authentification, et le service
   * ne se fie pas au contenu reçu — il réinterroge le prestataire.
   */
  static async retourPrestataire(req: Request, res: Response) {
    const token = req.params.token as string;
    try {
      await SignatureService.traiterRetour(token);
      // Réponse volontairement identique quel que soit le sort du jeton :
      // révéler l'état du contrat renseignerait un appelant non authentifié.
      res.status(200).json({ recu: true });
    } catch (erreur) {
      // On répond 200 à un jeton inconnu : un prestataire qui reçoit une erreur
      // réessaie en boucle, et un attaquant apprendrait quels jetons existent.
      console.warn(
        `[Signature] Retour non traité (${token.slice(0, 8)}…) :`,
        erreur instanceof Error ? erreur.message : erreur,
      );
      res.status(200).json({ recu: true });
    }
  }
}
