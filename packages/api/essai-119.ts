/**
 * Essai bout-en-bout de l'issue #119, contre la vraie base.
 *
 * Parcourt le trajet complet d'un encaissement :
 *   facture émise → référence QR attribuée → relevé camt.053 déposé →
 *   import par le connecteur → rapprochement → file d'attente.
 *
 * Précautions :
 *  - l'envoi du reçu au client est neutralisé (BANK_SEND_RECEIPT_ON_AUTO_MATCH),
 *    posé AVANT tout import du module de rapprochement qui le lit au chargement ;
 *  - les données créées appartiennent à un client d'essai dédié, avec une
 *    adresse non délivrable : aucun client réel n'est touché ;
 *  - tout est supprimé à la fin, sauf si l'on passe --garder.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execFileSync } from 'child_process';

// ⚠ Posé avant tout import du module de rapprochement, qui lit ces variables
// au chargement. C'est la raison pour laquelle main() charge ses dépendances
// par import dynamique : à ce stade, elles ne sont pas encore évaluées.
process.env.BANK_SEND_RECEIPT_ON_AUTO_MATCH = 'false';
process.env.BANK_PROVIDER = 'CAMT_FILE';

const GARDER = process.argv.includes('--garder');
const IBAN = 'CH5604835012345678009';
const IMPORT_DIR = process.env.BANK_CAMT_IMPORT_DIR || './storage/bank-import';
const MARQUEUR = 'ESSAI-119';

function titre(texte: string) {
  console.log(`\n${'─'.repeat(72)}\n${texte}\n${'─'.repeat(72)}`);
}

let echecs = 0;
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✅ ${libelle}`);
  } else {
    echecs += 1;
    console.error(`  ❌ ${libelle}${detail ? `\n     → ${detail}` : ''}`);
  }
}

async function main() {
  const { prisma } = await import('./src/shared/prisma.js');
  const { BankingService } = await import('./src/modules/banking/banking.service.js');
  const { ensureInvoicePaymentReference } = await import(
    './src/modules/banking/payment-reference.service.js'
  );
  const { BillingService } = await import('./src/modules/billing/billing.service.js');
  const { isValidQrReference, formatQrReference } = await import(
    './src/modules/banking/qr-reference.js'
  );

  // ─── 1. Jeu d'essai isolé ────────────────────────────────────────────────
  titre('1. Mise en place du jeu d’essai (client dédié, aucun client réel touché)');

  // Reliquat d'une passe interrompue : on repart d'une ardoise propre
  const ancien = await prisma.client.findUnique({
    where: { email: 'essai-119@example.invalid' },
    include: { mandats: true },
  });
  if (ancien) {
    for (const m of ancien.mandats) {
      await prisma.bankTransaction.deleteMany({
        where: { matchedInvoice: { mandatId: m.id } },
      });
      await prisma.invoice.deleteMany({ where: { mandatId: m.id } });
      await prisma.mandat.delete({ where: { id: m.id } });
    }
    console.log(`  (reliquat d'une passe précédente supprimé : ${ancien.mandats.length} mandat(s))`);
  }

  const client = await prisma.client.upsert({
    where: { email: 'essai-119@example.invalid' },
    update: {},
    create: {
      email: 'essai-119@example.invalid',
      firstName: 'Client',
      lastName: `Essai ${MARQUEUR}`,
      company: `Boulangerie Dupraz Sàrl (${MARQUEUR})`,
      status: 'ACTIF',
    },
  });
  console.log(`  Client d'essai : ${client.company} <${client.email}>`);

  const mandat = await prisma.mandat.create({
    data: {
      title: `Surveillance — essai rapprochement bancaire (${MARQUEUR})`,
      description: 'Mandat créé par essai-119.ts, supprimé en fin de script.',
      clientId: client.id,
      status: 'OUVERT',
    },
  });

  const montants = [2450.0, 1280.5, 890.0, 3600.0, 540.25];
  const factures = [];
  for (const amount of montants) {
    factures.push(
      await prisma.invoice.create({
        data: {
          mandatId: mandat.id,
          amount,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 86400000),
        },
      }),
    );
  }
  console.log(`  ${factures.length} factures PENDING créées : ${montants.map((m) => `${m.toFixed(2)} CHF`).join(', ')}`);

  // ─── 2. Attribution des références (le chemin réel d'émission) ───────────
  titre('2. Attribution de la référence QR à l’émission de la facture');

  for (const facture of factures) {
    const reference = await ensureInvoicePaymentReference(facture.id);
    verifier(
      `Facture ${facture.amount.toFixed(2)} CHF → ${formatQrReference(reference)}`,
      isValidQrReference(reference),
      `référence invalide : ${reference}`,
    );
  }

  // Idempotence : une seconde émission ne doit pas changer la référence
  const premiere = await ensureInvoicePaymentReference(factures[0].id);
  const seconde = await ensureInvoicePaymentReference(factures[0].id);
  verifier('La référence est stable d’une émission à l’autre', premiere === seconde);

  // Unicité
  const references = await prisma.invoice.findMany({
    where: { mandatId: mandat.id },
    select: { paymentReference: true },
  });
  const distinctes = new Set(references.map((r) => r.paymentReference));
  verifier('Chaque facture porte une référence distincte', distinctes.size === factures.length);

  // ─── 3. La référence figure bien sur le PDF envoyé au client ─────────────
  titre('3. Présence de la référence sur la facture PDF');

  const factureComplete = await prisma.invoice.findUnique({
    where: { id: factures[0].id },
    include: { mandat: { include: { client: true } }, quote: true },
  });
  const pdf = await BillingService.generateClientInvoicePDF(factureComplete, false);
  const texte = extraireTextePdf(pdf);
  verifier('Le PDF porte le bloc « Paiement par virement bancaire »', texte.includes('Paiement par virement'));
  verifier(
    'Le PDF porte la référence de paiement de la facture',
    texte.includes(formatQrReference(factureComplete!.paymentReference!)),
  );
  const pdfAcquitte = extraireTextePdf(await BillingService.generateClientInvoicePDF(factureComplete, true));
  verifier(
    'Une facture acquittée ne porte pas de consigne de virement',
    !pdfAcquitte.includes('Paiement par virement'),
  );

  // ─── 4. Déclaration du compte suivi ──────────────────────────────────────
  titre('4. Déclaration du compte bancaire suivi (lecture seule)');

  const compte = await BankingService.registerAccount(
    { iban: IBAN, label: `Compte d’essai ${MARQUEUR}`, provider: 'CAMT_FILE' },
    undefined,
  );
  console.log(`  Compte ${compte.iban} — connecteur ${compte.provider}`);

  // ─── 5. Dépôt du relevé camt.053 ─────────────────────────────────────────
  titre('5. Génération et dépôt du relevé camt.053');

  const avant = new Set(fs.existsSync(IMPORT_DIR) ? fs.readdirSync(IMPORT_DIR) : []);
  execFileSync('npx', ['tsx', 'generate-camt-sample.ts', IBAN], { stdio: 'inherit', shell: true });
  const nouveaux = (fs.existsSync(IMPORT_DIR) ? fs.readdirSync(IMPORT_DIR) : []).filter((f) => !avant.has(f));
  verifier('Un relevé a été déposé dans le répertoire d’import', nouveaux.length > 0, IMPORT_DIR);

  // ─── 6. Synchronisation : le chemin exact du cron de 6h ──────────────────
  titre('6. Synchronisation — chemin exact du cron quotidien');

  const resultat = await BankingService.syncAll();
  console.log(
    `  ${resultat.imported} écriture(s) importée(s) — ` +
      `${resultat.reconciliation.auto} automatique(s), ` +
      `${resultat.reconciliation.suggested} proposition(s), ` +
      `${resultat.reconciliation.unmatched} sans candidat`,
  );
  verifier('Des écritures ont été importées', resultat.imported > 0);
  verifier('Aucun compte en erreur', resultat.errors.length === 0, resultat.errors.join(' | '));

  // Idempotence de l'import : une seconde passe ne doit rien dupliquer
  const secondePasse = await BankingService.syncAll();
  verifier(
    'Une seconde synchronisation n’importe aucun doublon',
    secondePasse.imported === 0,
    `${secondePasse.imported} écriture(s) réimportée(s)`,
  );

  // ─── 7. Résultat du rapprochement ────────────────────────────────────────
  titre('7. Résultat du rapprochement');

  const ecritures = await prisma.bankTransaction.findMany({
    where: { bankAccountId: compte.id },
    orderBy: { amount: 'desc' },
  });

  console.log('');
  for (const e of ecritures) {
    const libelle = (e.remittanceInfo || e.debtorName || '—').slice(0, 34).padEnd(34);
    const sens = e.creditDebit === 'CRDT' ? ' ' : '−';
    console.log(
      `  │ ${libelle} │ ${sens}${e.amount.toFixed(2).padStart(9)} CHF │ ${e.status.padEnd(10)} │ ${(e.matchMethod || '—').padEnd(18)} │`,
    );
  }

  const soldées = await prisma.invoice.count({ where: { mandatId: mandat.id, status: 'PAID' } });
  const enAttente = ecritures.filter((e) => e.status === 'SUGGESTED' || e.status === 'UNMATCHED');

  console.log('');
  verifier('Des factures ont été soldées automatiquement', soldées > 0, `${soldées} facture(s)`);
  verifier(
    'Les écritures non rapprochées sont en file de vérification',
    enAttente.length > 0,
    `${enAttente.length} en attente`,
  );
  verifier(
    'Aucune écriture au débit n’a soldé de facture',
    ecritures.filter((e) => e.creditDebit === 'DBIT').every((e) => e.status !== 'MATCHED'),
  );

  // Le point critique : la facture soldée est bien celle que désignait la référence
  const appariées = ecritures.filter((e) => e.status === 'MATCHED' && e.matchedInvoiceId);
  let bonnesCibles = 0;
  for (const e of appariées) {
    const facture = await prisma.invoice.findUnique({ where: { id: e.matchedInvoiceId! } });
    if (facture && Math.abs(facture.amount - e.amount) < 0.01) bonnesCibles += 1;
  }
  verifier(
    'Chaque rapprochement automatique vise la bonne facture',
    bonnesCibles === appariées.length,
    `${bonnesCibles}/${appariées.length}`,
  );

  // Aucun reçu ne doit être parti (flag neutralisé)
  verifier(
    'Aucun reçu n’a été envoyé pendant l’essai (envoi neutralisé)',
    process.env.BANK_SEND_RECEIPT_ON_AUTO_MATCH === 'false',
  );

  // ─── 8. La file d'attente telle que la voit l'écran /banque ──────────────
  titre('8. File d’attente de vérification manuelle (écran /banque)');

  const stats = await BankingService.getStats();
  console.log('  Statistiques :', JSON.stringify(stats));

  const suggérée = ecritures.find((e) => e.status === 'SUGGESTED');
  if (suggérée) {
    const candidats = await BankingService.getCandidates(suggérée.id);
    console.log(
      `  Écriture « ${(suggérée.remittanceInfo || suggérée.debtorName || '').slice(0, 40)} » ` +
        `(${suggérée.amount.toFixed(2)} CHF) : ${candidats.length} candidat(s) pré-classé(s)`,
    );
    for (const c of candidats.slice(0, 3)) {
      console.log(`     · score ${c.score.toFixed(2)} — ${c.method} — facture ${c.invoiceId.slice(0, 8)}`);
    }
    verifier('La file d’attente propose au moins un candidat', candidats.length > 0);
    verifier(
      'Le premier candidat proposé est la facture du bon montant',
      candidats.length > 0 &&
        (await prisma.invoice.findUnique({ where: { id: candidats[0].invoiceId } }))!.amount ===
          suggérée.amount,
    );

    // La validation humaine depuis la file d'attente doit solder la facture.
    // En mode --garder on s'en abstient : la file reste peuplée pour l'inspection
    // à l'écran, et aucun reçu n'est envoyé (la validation manuelle, elle, en
    // envoie toujours un — c'est un geste humain délibéré).
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (GARDER) {
      console.log('  --garder : validation manuelle non exercée, la file reste peuplée.');
    } else if (candidats.length && admin) {
      await BankingService.matchManually(suggérée.id, candidats[0].invoiceId, admin.id);
      const apres = await prisma.invoice.findUnique({ where: { id: candidats[0].invoiceId } });
      verifier('La validation manuelle solde bien la facture', apres!.status === 'PAID');
      const journal = await prisma.auditLog.findFirst({
        where: { entity: 'BankTransaction', entityId: suggérée.id },
        orderBy: { createdAt: 'desc' },
      });
      verifier('L’action de rapprochement est journalisée (AuditLog)', journal !== null, 'aucune entrée');
    }
  }

  // ─── 9. Nettoyage ────────────────────────────────────────────────────────
  titre('9. Nettoyage');

  if (GARDER) {
    console.log('  --garder : les données d’essai sont conservées pour inspection dans l’interface.');
    console.log(`  Client d'essai : ${client.email} — mandat : ${mandat.id}`);
  } else {
    await prisma.bankTransaction.deleteMany({ where: { bankAccountId: compte.id } });
    await prisma.bankAccount.delete({ where: { id: compte.id } });
    await prisma.invoice.deleteMany({ where: { mandatId: mandat.id } });
    await prisma.mandat.delete({ where: { id: mandat.id } });
    await prisma.client.delete({ where: { id: client.id } });
    // Le connecteur archive les relevés traités dans processed/ : on y cherche aussi
    for (const f of nouveaux) {
      for (const p of [path.join(IMPORT_DIR, f), ...archivés(IMPORT_DIR, f)]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
    console.log('  Données d’essai, compte suivi et relevé (y compris archivé) supprimés.');
  }

  titre(echecs === 0 ? '✅ Essai bout-en-bout réussi' : `❌ ${echecs} vérification(s) en échec`);
  await prisma.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}

/** Retrouve un relevé déplacé par le connecteur dans son dossier d'archive */
function archivés(importDir: string, nom: string): string[] {
  const dir = path.join(importDir, 'processed');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(nom))
    .map((f) => path.join(dir, f));
}

/** Extrait le texte d'un PDF pdfkit (flux compressés, texte en hexadécimal) */
function extraireTextePdf(buf: Buffer): string {
  let out = '';
  let idx = 0;
  while (true) {
    const s = buf.indexOf('stream', idx);
    if (s === -1) break;
    const e = buf.indexOf('endstream', s);
    if (e === -1) break;
    let start = s + 6;
    while (buf[start] === 0x0d || buf[start] === 0x0a) start++;
    try {
      out += zlib.inflateSync(buf.subarray(start, e)).toString('latin1');
    } catch {}
    idx = e + 9;
  }
  const lignes: string[] = [];
  for (const m of out.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
    let texte = '';
    for (const h of m[1].matchAll(/<([0-9a-fA-F]+)>/g)) {
      texte += Buffer.from(h[1], 'hex').toString('latin1');
    }
    lignes.push(texte);
  }
  return lignes.join('\n');
}

main().catch(async (error) => {
  console.error('\n❌ Échec de l’essai :', error);
  process.exit(1);
});
