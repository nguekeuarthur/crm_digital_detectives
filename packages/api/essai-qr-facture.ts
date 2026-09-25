/**
 * Essai de la section paiement (QR-facture) sur le PDF de facture.
 *
 * Exerce les quatre situations réelles : IBAN ordinaire + référence SCOR,
 * QR-IBAN + référence QR, les deux combinaisons incohérentes que la norme
 * rejette, et la configuration incomplète. Aucune base n'est touchée.
 */
import fs from 'fs';
import { buildQrReference, buildScorReference } from './src/modules/banking/qr-reference.js';

const SORTIE = process.argv[2] || './qr-facture-essai.pdf';

const ADRESSE = {
  COMPANY_NAME: 'Digital Detectives Sàrl',
  COMPANY_STREET: 'Rue du Rhône',
  COMPANY_BUILDING_NUMBER: '14',
  COMPANY_POSTAL_CODE: '1204',
  COMPANY_CITY: 'Genève',
  COMPANY_COUNTRY: 'CH',
};

const IBAN_ORDINAIRE = 'CH5604835012345678009';
const QR_IBAN = 'CH4431999123000889012';

let echecs = 0;
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) console.log(`  ✅ ${libelle}`);
  else {
    echecs += 1;
    console.error(`  ❌ ${libelle}${detail ? `\n     → ${detail}` : ''}`);
  }
}

function configurer(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

async function main() {
  const { attacherQrBill, expliquerAbsence } = await import('./src/modules/banking/qr-bill.service.js');
  const { typeReferenceCourant } = await import('./src/modules/banking/payment-reference.service.js');
  const PDFDocument = (await import('pdfkit')).default;

  const graine = '8104001181455493';
  const refScor = buildScorReference(graine, '');
  const refQr = buildQrReference(graine, '');

  const facture = (reference: string) => ({ montant: 2450.0, reference, message: 'Facture DD-2026-0042' });

  // ─── 1. IBAN ordinaire + SCOR : la situation d'aujourd'hui ───────────────
  console.log('\n1. IBAN ordinaire + référence SCOR (situation actuelle)');
  configurer({ ...ADRESSE, COMPANY_IBAN: IBAN_ORDINAIRE });
  verifier('Le format imposé est bien SCOR', typeReferenceCourant() === 'SCOR');

  const doc = new PDFDocument({ margin: 50 });
  const morceaux: Buffer[] = [];
  doc.on('data', (c: Buffer) => morceaux.push(c));
  const fini = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(morceaux))));

  doc.fontSize(20).text('FACTURE', { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text('Client : Jean Martin');
  doc.text('Montant total à régler : 2450.00 CHF');

  const r1 = attacherQrBill(doc, facture(refScor));
  verifier('La section paiement est produite', r1.ajoutee, r1.ajoutee ? '' : expliquerAbsence(r1));
  doc.end();
  const pdf = await fini;
  fs.writeFileSync(SORTIE, pdf);
  verifier('Le PDF est écrit et non vide', pdf.length > 5000, `${pdf.length} octets`);
  console.log(`     référence : ${refScor} — fichier : ${SORTIE} (${pdf.length} octets)`);

  // ─── 2. QR-IBAN + référence QR : après obtention du QR-IBAN ──────────────
  console.log('\n2. QR-IBAN + référence QR (après démarche UBS)');
  configurer({ ...ADRESSE, COMPANY_IBAN: QR_IBAN });
  verifier('Le format imposé bascule sur QRR', typeReferenceCourant() === 'QRR');
  const d2 = new PDFDocument({ margin: 50 });
  d2.on('data', () => {});
  const r2 = attacherQrBill(d2, facture(refQr));
  verifier('La section paiement est produite', r2.ajoutee, r2.ajoutee ? '' : expliquerAbsence(r2));
  d2.end();

  // ─── 3. Les deux incohérences que la norme rejette ───────────────────────
  console.log('\n3. Incohérences compte / référence (doivent être refusées)');
  const d3 = new PDFDocument({ margin: 50 });
  d3.on('data', () => {});
  configurer({ ...ADRESSE, COMPANY_IBAN: QR_IBAN });
  const r3 = attacherQrBill(d3, facture(refScor));
  verifier('QR-IBAN + référence SCOR est refusé', !r3.ajoutee, 'la section a été produite à tort');
  if (!r3.ajoutee) console.log(`     ${expliquerAbsence(r3)}`);

  configurer({ ...ADRESSE, COMPANY_IBAN: IBAN_ORDINAIRE });
  const r4 = attacherQrBill(d3, facture(refQr));
  verifier('IBAN ordinaire + référence QR est refusé', !r4.ajoutee, 'la section a été produite à tort');
  if (!r4.ajoutee) console.log(`     ${expliquerAbsence(r4)}`);
  d3.end();

  // ─── 4. Configuration incomplète : la facture doit rester émissible ──────
  console.log('\n4. Configuration incomplète (repli sur le texte)');
  const d4 = new PDFDocument({ margin: 50 });
  d4.on('data', () => {});
  configurer({ ...ADRESSE, COMPANY_IBAN: IBAN_ORDINAIRE, COMPANY_STREET: undefined });
  const r5 = attacherQrBill(d4, facture(refScor));
  verifier('Sans adresse du bénéficiaire, aucune section n’est produite', !r5.ajoutee);
  verifier('Le motif est explicite', r5.motif === 'CONFIG_INCOMPLETE', String(r5.motif));
  if (!r5.ajoutee) console.log(`     ${expliquerAbsence(r5)}`);

  configurer({ ...ADRESSE, COMPANY_IBAN: IBAN_ORDINAIRE });
  const r6 = attacherQrBill(d4, { montant: 100, reference: null });
  verifier('Sans référence, aucune section n’est produite', !r6.ajoutee && r6.motif === 'REFERENCE_ABSENTE');
  d4.end();

  console.log(echecs === 0 ? '\n✅ Section paiement conforme dans les quatre cas' : `\n❌ ${echecs} échec(s)`);
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
