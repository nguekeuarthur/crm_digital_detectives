import { SignatureProvider, SignatureQuality } from '@prisma/client';
import { SignatureProviderPort } from '../signature.types';
import { SkribbleProvider } from './skribble.provider';
import { MockProvider } from './mock.provider';

export { SkribbleProvider, MockProvider };

/**
 * Connecteur retenu par la configuration.
 *
 * Tant que SIGNATURE_PROVIDER n'est pas explicitement placé sur SKRIBBLE, le
 * CRM reste en simulation : aucun appel n'est émis vers un prestataire, aucune
 * signature n'est facturée. Passer en production doit être un geste délibéré.
 *
 * La valeur est validée strictement : une graphie inattendue lève au lieu de
 * retomber en silence sur la simulation. Sans cela, une faute de frappe en
 * production ferait archiver un document de simulation comme contrat signé,
 * puis l'annoncerait au client comme faisant foi.
 */
export function connecteurParDefaut(): SignatureProvider {
  const brut = (process.env.SIGNATURE_PROVIDER || 'MOCK').trim().toUpperCase();

  if (brut === 'SKRIBBLE') return SignatureProvider.SKRIBBLE;

  if (brut !== 'MOCK') {
    throw new Error(
      `SIGNATURE_PROVIDER="${process.env.SIGNATURE_PROVIDER}" est inconnu. ` +
        'Valeurs acceptées : SKRIBBLE ou MOCK.',
    );
  }

  // La simulation produit des documents sans valeur juridique : elle n'a rien
  // à faire en production, où le client recevrait un faux contrat signé.
  if (process.env.NODE_ENV === 'production' && process.env.SIGNATURE_ALLOW_MOCK !== 'true') {
    throw new Error(
      'Le connecteur de signature est en simulation alors que NODE_ENV=production. ' +
        'Placez SIGNATURE_PROVIDER=SKRIBBLE, ou SIGNATURE_ALLOW_MOCK=true si la simulation est voulue.',
    );
  }

  return SignatureProvider.MOCK;
}

// Les connecteurs sont réutilisés d'un appel à l'autre : SkribbleProvider met
// son jeton JWT en cache sur l'instance, et une instance neuve à chaque
// opération imposerait un POST /v2/access/login par contrat.
const INSTANCES = new Map();

export function obtenirConnecteur(kind: SignatureProvider): SignatureProviderPort {
  const existant = INSTANCES.get(kind);
  if (existant) return existant;

  let connecteur;
  switch (kind) {
    case SignatureProvider.SKRIBBLE:
      connecteur = new SkribbleProvider();
      break;
    case SignatureProvider.MOCK:
      connecteur = new MockProvider();
      break;
    default: {
      // Exhaustivité forcée, comme getBankProvider() du module banking :
      // un connecteur ajouté sans être traité ici doit casser à la compilation.
      const exhaustif: never = kind;
      throw new Error(`Connecteur de signature inconnu : ${exhaustif}`);
    }
  }

  INSTANCES.set(kind, connecteur);
  return connecteur;
}

/**
 * Ordre des niveaux, du moins engageant au plus engageant. Sert à comparer une
 * qualité demandée au plancher : SES ne vérifie aucune identité, QES équivaut
 * à une signature manuscrite.
 */
const RANG: Record<SignatureQuality, number> = {
  [SignatureQuality.SES]: 0,
  [SignatureQuality.AES]: 1,
  [SignatureQuality.QES]: 2,
};

/**
 * Niveau minimal que l'agence accepte, quel que soit ce que demande l'appelant.
 *
 * Sans plancher, le niveau serait entièrement piloté par le corps de la
 * requête : un contrat pourrait être fait signer en SES — sans la moindre
 * vérification d'identité — et finir dans le même état « signé » qu'une QES.
 * Par défaut le plancher est le niveau configuré, donc on ne peut pas
 * descendre ; l'abaisser est un geste explicite.
 */
export function qualiteMinimale(): SignatureQuality {
  const brut = (process.env.SIGNATURE_MIN_QUALITY || '').trim().toUpperCase();
  if (brut === 'SES') return SignatureQuality.SES;
  if (brut === 'AES') return SignatureQuality.AES;
  if (brut === 'QES') return SignatureQuality.QES;
  if (brut) {
    throw new Error(
      `SIGNATURE_MIN_QUALITY="${process.env.SIGNATURE_MIN_QUALITY}" est inconnu. ` +
        'Valeurs acceptées : QES, AES ou SES.',
    );
  }
  return qualiteParDefaut();
}

/** La qualité demandée atteint-elle le plancher ? */
export function qualiteAutorisee(demandee: SignatureQuality): boolean {
  return RANG[demandee] >= RANG[qualiteMinimale()];
}

/** Niveau de signature demandé par défaut */
export function qualiteParDefaut(): SignatureQuality {
  const brut = (process.env.SIGNATURE_QUALITY || 'QES').trim().toUpperCase();
  if (brut === 'SES') return SignatureQuality.SES;
  if (brut === 'AES') return SignatureQuality.AES;
  if (brut !== 'QES') {
    throw new Error(
      `SIGNATURE_QUALITY="${process.env.SIGNATURE_QUALITY}" est inconnu. ` +
        'Valeurs acceptées : QES, AES ou SES.',
    );
  }
  return SignatureQuality.QES;
}
