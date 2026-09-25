/**
 * Essai bout-en-bout du circuit de signature (issue #122), contre la vraie base.
 *
 *   contrat généré → envoi au client → signature → retour → archivage →
 *   confirmation
 *
 * Précautions :
 *  - connecteur forcé en simulation : aucun appel à Skribble, aucune signature
 *    facturée, aucun essai de 14 jours consommé ;
 *  - client d'essai dédié, adresse non délivrable : aucun client réel touché ;
 *  - tout est supprimé à la fin, sauf --garder.
 */
import 'dotenv/config';

process.env.SIGNATURE_PROVIDER = 'MOCK';
process.env.SIGNATURE_QUALITY = 'QES';

const GARDER = process.argv.includes('--garder');
const EMAIL_ESSAI = 'essai-122@example.invalid';
const MARQUEUR = 'ESSAI-122';

let echecs = 0;
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) console.log(`  ✅ ${libelle}`);
  else {
    echecs += 1;
    console.error(`  ❌ ${libelle}${detail ? `\n     → ${detail}` : ''}`);
  }
}

function titre(texte: string) {
  console.log(`\n${'─'.repeat(72)}\n${texte}\n${'─'.repeat(72)}`);
}

/**
 * Supprime un mandat d'essai et tout ce qui s'y rattache. Plusieurs relations
 * sont en RESTRICT : l'ordre compte, les dépendances d'abord.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function supprimerMandat(prisma: any, mandatId: string) {
  await prisma.activity.deleteMany({ where: { mandatId } });
  await prisma.email.deleteMany({ where: { mandatId } });
  await prisma.timeEntry.deleteMany({ where: { mandatId } });
  await prisma.invoice.deleteMany({ where: { mandatId } });
  await prisma.contract.deleteMany({ where: { mandatId } });
  await prisma.quote.deleteMany({ where: { mandatId } });
  await prisma.mandatSubcontractor.deleteMany({ where: { mandatId } });
  const dossiers = await prisma.dossier.findMany({ where: { mandatId } });
  for (const d of dossiers) {
    await prisma.file.deleteMany({ where: { folderId: d.id } });
  }
  await prisma.dossier.deleteMany({ where: { mandatId } });
  await prisma.mandat.delete({ where: { id: mandatId } });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function main() {
  const { prisma } = await import('./src/shared/prisma.js');
  const { SignatureService } = await import('./src/modules/signature/signature.service.js');
  const { MockProvider, connecteurParDefaut } = await import('./src/modules/signature/providers/index.js');
  const { FileService } = await import('./src/modules/file/file.service.js');
  const PDFDocument = (await import('pdfkit')).default;

  verifier('Le connecteur actif est bien la simulation', connecteurParDefaut() === 'MOCK');

  // ─── 1. Jeu d'essai ───────────────────────────────────────────────────────
  titre('1. Mise en place (client dédié, aucun client réel touché)');

  const ancien = await prisma.client.findUnique({
    where: { email: EMAIL_ESSAI },
    include: { mandats: true },
  });
  if (ancien) {
    for (const m of ancien.mandats) await supprimerMandat(prisma, m.id);
    console.log(`  (reliquat supprimé : ${ancien.mandats.length} mandat(s))`);
  }

  const client = await prisma.client.upsert({
    where: { email: EMAIL_ESSAI },
    update: {},
    create: {
      email: EMAIL_ESSAI,
      firstName: 'Camille',
      lastName: `Rochat ${MARQUEUR}`,
      phone: '+41791234567',
      status: 'ACTIF',
    },
  });

  const mandat = await prisma.mandat.create({
    data: {
      title: `Filature — essai signature (${MARQUEUR})`,
      clientId: client.id,
      status: 'OUVERT',
    },
  });

  const dossier = await prisma.dossier.create({
    data: { name: 'Contrats et Administratif', mandatId: mandat.id },
  });

  // Un vrai PDF, comme celui que produit generateContract()
  const pdf: Buffer = await new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const morceaux: Buffer[] = [];
    doc.on('data', (c: Buffer) => morceaux.push(c));
    doc.on('end', () => resolve(Buffer.concat(morceaux)));
    doc.fontSize(18).text('CONTRAT DE MANDAT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Entre Digitaldetectives et ${client.firstName} ${client.lastName}.`);
    doc.text(`Objet : ${mandat.title}`);
    doc.end();
  });

  const fichier = await FileService.uploadFile({
    name: `Contrat_${MARQUEUR}.pdf`,
    buffer: pdf,
    mimeType: 'application/pdf',
    size: pdf.length,
    folderId: dossier.id,
    userId: null,
  });

  const template = await prisma.contractTemplate.create({
    data: { name: `Modèle ${MARQUEUR}`, htmlContent: '<p>{{client.firstName}}</p>' },
  });

  const contrat = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });

  console.log(`  Contrat ${contrat.id.slice(0, 8)} — client ${client.email}`);
  verifier('Un contrat neuf est à l’état DRAFT', contrat.status === 'DRAFT');

  // ─── 2. Envoi ─────────────────────────────────────────────────────────────
  titre('2. Envoi du contrat pour signature');

  const envoi = await SignatureService.envoyerPourSignature(contrat.id, { userId: undefined });
  verifier('Le contrat passe à SENT', envoi.contrat.status === 'SENT');
  verifier('Une demande est enregistrée chez le prestataire', Boolean(envoi.contrat.signatureRequestId));
  verifier('Un jeton de retour est attribué', Boolean(envoi.contrat.callbackToken));
  verifier('Le signataire est figé', envoi.contrat.signerEmail === EMAIL_ESSAI);
  verifier('Le niveau demandé est la signature qualifiée', envoi.contrat.signatureQuality === 'QES');
  console.log(`     demande : ${envoi.contrat.signatureRequestId}`);

  // ─── 3. Garde-fous ────────────────────────────────────────────────────────
  titre('3. Garde-fous');

  let refuse = false;
  try {
    await SignatureService.envoyerPourSignature(contrat.id);
  } catch {
    refuse = true;
  }
  verifier('Un second envoi sur une demande ouverte est refusé', refuse);

  const avant = await prisma.contract.findUnique({ where: { id: contrat.id } });
  const resultatFaux = await SignatureService.traiterRetour(envoi.contrat.callbackToken!);
  verifier(
    'Un retour reçu alors que rien n’est signé ne change rien',
    Boolean(resultatFaux.ignore) && avant?.status === 'SENT',
  );

  let jetonRefuse = false;
  try {
    await SignatureService.traiterRetour('jeton-inexistant-0000');
  } catch {
    jetonRefuse = true;
  }
  verifier('Un jeton inconnu est rejeté', jetonRefuse);

  // ─── 4. Signature et archivage ────────────────────────────────────────────
  titre('4. Le client signe : retour, archivage, confirmation');

  MockProvider.faireSigner(envoi.contrat.signatureRequestId!);
  const retour = await SignatureService.traiterRetour(envoi.contrat.callbackToken!);

  verifier('Le contrat passe à SIGNED', retour.contrat.status === 'SIGNED');
  verifier('La date de signature est enregistrée', Boolean(retour.contrat.signedAt));
  verifier('Le document signé est archivé', Boolean(retour.contrat.signedFileId));

  const signe = await prisma.file.findUnique({ where: { id: retour.contrat.signedFileId! } });
  verifier(
    'Le document signé est rangé dans le dossier « Contrats et Administratif »',
    signe?.folderId === dossier.id,
    signe?.folderId,
  );
  verifier('Son nom le distingue de l’original', signe?.name.endsWith('_signe.pdf') === true, signe?.name);

  const contenuSigne = await FileService.getFileBuffer(signe!.id);
  verifier('Le document archivé est un PDF non vide', contenuSigne.length > 1000, `${contenuSigne.length} octets`);
  verifier(
    'Le document original reste intact à côté',
    (await prisma.file.count({ where: { folderId: dossier.id } })) === 2,
  );

  // ─── 5. Idempotence ───────────────────────────────────────────────────────
  titre('5. Idempotence des retours');

  const nbFichiersAvant = await prisma.file.count({ where: { folderId: dossier.id } });
  const rejoue = await SignatureService.traiterRetour(envoi.contrat.callbackToken!);
  const nbFichiersApres = await prisma.file.count({ where: { folderId: dossier.id } });
  verifier('Un retour rejoué est reconnu comme déjà traité', rejoue.deja === true);
  verifier(
    'Un retour rejoué n’archive pas le document deux fois',
    nbFichiersAvant === nbFichiersApres,
    `${nbFichiersAvant} → ${nbFichiersApres}`,
  );
  verifier('Le contrat reste à SIGNED', rejoue.contrat.status === 'SIGNED');

  // ─── 5 bis. Concurrence webhook / cron ────────────────────────────────────
  titre('5 bis. Deux retours simultanés sur le même contrat');

  const contratC = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });
  const envoiC = await SignatureService.envoyerPourSignature(contratC.id);
  MockProvider.faireSigner(envoiC.contrat.signatureRequestId!);

  const fichiersAvant = await prisma.file.count({ where: { folderId: dossier.id } });
  // Le webhook et le cron peuvent tomber exactement en même temps : un seul
  // doit archiver. Sans prise atomique, le client recevrait deux exemplaires.
  const [a, b] = await Promise.all([
    SignatureService.traiterRetour(envoiC.contrat.callbackToken!),
    SignatureService.traiterRetour(envoiC.contrat.callbackToken!),
  ]);
  const fichiersApres = await prisma.file.count({ where: { folderId: dossier.id } });

  verifier(
    'Deux retours simultanés n’archivent qu’un seul document',
    fichiersApres - fichiersAvant === 1,
    `${fichiersApres - fichiersAvant} fichier(s) ajouté(s)`,
  );
  verifier(
    'Un seul des deux traite réellement le retour',
    [a.deja, b.deja].filter(Boolean).length === 1,
    `deja = ${a.deja} / ${b.deja}`,
  );
  const finalC = await prisma.contract.findUnique({ where: { id: contratC.id } });
  verifier('Le contrat est bien SIGNED avec un document', finalC?.status === 'SIGNED' && Boolean(finalC?.signedFileId));

  // ─── 6. Le refus ──────────────────────────────────────────────────────────
  titre('6. Cas du refus');

  const contrat2 = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });
  const envoi2 = await SignatureService.envoyerPourSignature(contrat2.id);
  MockProvider.faireRefuser(envoi2.contrat.signatureRequestId!);
  const retour2 = await SignatureService.traiterRetour(envoi2.contrat.callbackToken!);
  verifier('Un refus place le contrat à DECLINED', retour2.contrat.status === 'DECLINED');
  verifier('Aucun document n’est archivé pour un refus', retour2.contrat.signedFileId === null);

  // ─── 7. Annulation ────────────────────────────────────────────────────────
  titre('7. Annulation d’une demande en cours');

  const contrat3 = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });
  await SignatureService.envoyerPourSignature(contrat3.id);
  const annule = await SignatureService.annuler(contrat3.id);
  verifier('Le contrat passe à WITHDRAWN', annule.status === 'WITHDRAWN');

  // ─── 7 bis. Plancher de niveau de signature ───────────────────────────────
  titre('7 bis. Plancher de niveau de signature');

  const { qualiteMinimale, qualiteAutorisee } = await import('./src/modules/signature/providers/index.js');

  verifier('Le plancher suit le niveau configuré', qualiteMinimale() === 'QES');
  verifier('Une demande QES est autorisée', qualiteAutorisee('QES'));
  verifier('Une demande AES est refusée sous plancher QES', !qualiteAutorisee('AES'));
  verifier('Une demande SES est refusée sous plancher QES', !qualiteAutorisee('SES'));

  // Le refus doit venir du service, pas seulement de la route : un cron ou un
  // script contourneraient une vérification posée uniquement à l'entrée HTTP.
  const contratQ = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });
  let sousPlancherRefuse = false;
  try {
    await SignatureService.envoyerPourSignature(contratQ.id, { qualite: 'SES' });
  } catch {
    sousPlancherRefuse = true;
  }
  verifier('Le service refuse un envoi sous le plancher', sousPlancherRefuse);
  const apresRefus = await prisma.contract.findUnique({ where: { id: contratQ.id } });
  verifier('Le contrat refusé reste à DRAFT', apresRefus?.status === 'DRAFT', apresRefus?.status);

  // Plancher abaissé explicitement : la demande passe
  process.env.SIGNATURE_MIN_QUALITY = 'SES';
  verifier('Plancher abaissé, une demande SES redevient autorisée', qualiteAutorisee('SES'));
  const envoiQ = await SignatureService.envoyerPourSignature(contratQ.id, { qualite: 'SES' });
  verifier('L’envoi en SES aboutit et le niveau est conservé', envoiQ.contrat.signatureQuality === 'SES');
  delete process.env.SIGNATURE_MIN_QUALITY;

  // ─── 8. Journal d'audit ───────────────────────────────────────────────────
  titre('8. Traçabilité');

  const journal = await prisma.auditLog.findMany({
    where: { entity: 'Contract', entityId: { in: [contrat.id, contratC.id, contratQ.id, contrat2.id, contrat3.id] } },
    orderBy: { createdAt: 'asc' },
  });
  for (const e of journal) console.log(`     ${e.action}`);
  verifier(
    'Envoi, signature, refus et annulation sont journalisés',
    ['CONTRACT_SENT_FOR_SIGNATURE', 'CONTRACT_SIGNED', 'CONTRACT_SIGNATURE_DECLINED', 'CONTRACT_SIGNATURE_WITHDRAWN'].every(
      (a) => journal.some((e) => e.action === a),
    ),
    journal.map((e) => e.action).join(', '),
  );

  // ─── 9. Nettoyage ─────────────────────────────────────────────────────────
  titre('9. Nettoyage');

  if (GARDER) {
    console.log(`  --garder : données conservées. Client ${EMAIL_ESSAI}, mandat ${mandat.id}`);
  } else {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [contrat.id, contratC.id, contratQ.id, contrat2.id, contrat3.id] } } });
    await supprimerMandat(prisma, mandat.id);
    await prisma.contractTemplate.delete({ where: { id: template.id } });
    await prisma.client.delete({ where: { id: client.id } });
    await prisma.email.deleteMany({ where: { to: { contains: 'essai-122' } } });
    console.log('  Données d’essai supprimées.');
  }

  titre(echecs === 0 ? '✅ Circuit de signature conforme' : `❌ ${echecs} vérification(s) en échec`);
  await prisma.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((erreur) => {
  console.error('\n❌ Échec de l’essai :', erreur);
  process.exit(1);
});
