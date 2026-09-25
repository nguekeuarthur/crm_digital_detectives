/**
 * Passe de VRAIS relevés camt.053 d'UBS dans le parseur du CRM.
 *
 *   npx tsx essai-camt-reel.ts <dossier>
 *
 * Tous les essais précédents portaient sur des fichiers que le CRM fabriquait
 * lui-même : ils ne prouvaient rien sur la structure réelle produite par la
 * banque. Ce script lit les relevés d'UBS tels quels et montre ce que le
 * parseur en tire, écriture par écriture.
 */
import fs from 'fs';
import path from 'path';
import { parseCamtDocument } from './src/modules/banking/camt-parser.js';

const DOSSIER = process.argv[2] || '/tmp/camt-reels';

function main() {
  const fichiers = fs
    .readdirSync(DOSSIER)
    .filter((f) => f.toLowerCase().endsWith('.xml'))
    .sort();

  if (!fichiers.length) {
    console.error(`Aucun XML dans ${DOSSIER}`);
    process.exit(1);
  }

  let total = 0;
  let sansNom = 0;
  let avecReference = 0;
  const credits: string[] = [];

  for (const fichier of fichiers) {
    const contenu = fs.readFileSync(path.join(DOSSIER, fichier));
    console.log(`\n${'═'.repeat(78)}\n${fichier}\n${'═'.repeat(78)}`);

    let releves;
    try {
      releves = parseCamtDocument(contenu);
    } catch (erreur) {
      console.error(`  ÉCHEC DU PARSEUR : ${erreur instanceof Error ? erreur.message : erreur}`);
      continue;
    }

    for (const releve of releves) {
      console.log(`  Compte : ${releve.iban ?? '(absent)'}   Devise : ${releve.currency ?? '(absente)'}`);
      console.log(`  ${releve.transactions.length} écriture(s)\n`);

      for (const t of releve.transactions) {
        total += 1;
        const sens = t.creditDebit === 'CRDT' ? '+' : '−';
        const nom = t.debtorName ?? '';
        if (!nom) sansNom += 1;
        if (t.structuredRef) avecReference += 1;
        if (t.creditDebit === 'CRDT') {
          credits.push(`${sens}${t.amount} ${nom || '(nom absent)'}`);
        }

        console.log(`  ${sens}${String(t.amount).padStart(9)} ${t.currency}  ${t.bookingDate?.toISOString().slice(0, 10)}`);
        console.log(`     identifiant  : ${t.externalId}`);
        console.log(`     donneur      : ${nom || '⚠ ABSENT'}`);
        console.log(`     référence    : ${t.structuredRef || '—'}`);
        console.log(`     communication: ${(t.remittanceInfo || '—').slice(0, 70)}`);
        console.log(`     end-to-end   : ${t.endToEndId || '—'}`);
        console.log('');
      }
    }
  }

  console.log('═'.repeat(78));
  console.log(`Écritures lues            : ${total}`);
  console.log(`Sans nom de contrepartie  : ${sansNom}${sansNom ? '   ⚠ le rapprochement par nom ne pourra pas jouer' : ''}`);
  console.log(`Avec référence structurée : ${avecReference}`);
  console.log(`\nCrédits (ce que le CRM tenterait de rapprocher) :`);
  for (const c of credits) console.log(`  ${c}`);
}

main();
