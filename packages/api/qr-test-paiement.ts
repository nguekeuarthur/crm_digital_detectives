/**
 * Produit une QR-facture de TEST avec les coordonnées bancaires réelles, pour
 * qu'Arnaud puisse faire un virement d'essai depuis son application bancaire.
 *
 *   npx tsx qr-test-paiement.ts [montant]
 *
 * À savoir : il n'existe pas de « QR code générique » dans le CRM. Chaque
 * facture porte sa propre référence — c'est précisément elle qui permet de
 * rapprocher automatiquement le virement de la bonne facture. Un code unique et
 * figé rendrait tous les paiements indiscernables.
 *
 * Le code produit ici porte donc une référence de test fixe, réservée à cet
 * usage : un virement qui la porte sera reconnu comme un paiement d'essai et
 * n'ira solder aucune facture.
 */
import 'dotenv/config';
import fs from 'fs';

const MONTANT = Number(process.argv[2] || 1);
const SORTIE = './QR-test-paiement.pdf';

// Référence de test, stable : elle ne correspond à aucune facture.
const GRAINE_TEST = 'TESTPAIEMENT001';

async function main() {
  const { buildScorReference, buildQrReference, isQrIban, formatQrReference } = await import(
    './src/modules/banking/qr-reference.js'
  );
  const { attacherQrBill, expliquerAbsence, lireCreancier } = await import(
    './src/modules/banking/qr-bill.service.js'
  );
  const PDFDocument = (await import('pdfkit')).default;

  const creancier = lireCreancier();
  if (!creancier) {
    console.error(
      'Coordonnées du bénéficiaire incomplètes dans .env : ' +
        'COMPANY_NAME, COMPANY_IBAN, COMPANY_STREET, COMPANY_POSTAL_CODE, COMPANY_CITY sont requis.',
    );
    process.exit(1);
  }

  // Le format de référence suit le compte : QR-IBAN → référence QR, sinon SCOR.
  const reference = isQrIban(creancier.iban)
    ? buildQrReference(GRAINE_TEST.replace(/\D/g, '') || '1')
    : buildScorReference(GRAINE_TEST, '');

  console.log('Bénéficiaire :', creancier.nom);
  console.log('IBAN         :', creancier.iban);
  console.log('Adresse      :', `${creancier.rue} ${creancier.numero ?? ''}, ${creancier.npa} ${creancier.localite}`);
  console.log('Type         :', isQrIban(creancier.iban) ? 'QR-IBAN' : 'IBAN ordinaire');
  console.log('Référence    :', isQrIban(creancier.iban) ? formatQrReference(reference) : reference);
  console.log('Montant      :', `${MONTANT.toFixed(2)} CHF`);

  const doc = new PDFDocument({ margin: 50 });
  const morceaux: Buffer[] = [];
  doc.on('data', (c: Buffer) => morceaux.push(c));
  const fini = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(morceaux))),
  );

  doc.fontSize(20).fillColor('#1a1a2e').text('TEST DE PAIEMENT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#666').text(
    'Ce document sert uniquement à éprouver la chaîne encaissement du CRM. ' +
      'Il ne correspond à aucune prestation et la référence qu’il porte ne soldera aucune facture.',
    { align: 'center' },
  );
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor('#333');
  doc.text(`Bénéficiaire : ${creancier.nom}`);
  doc.text(`IBAN : ${creancier.iban}`);
  doc.text(`Montant : ${MONTANT.toFixed(2)} CHF`);
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(
    'Marche à suivre : scanner le code ci-dessous avec l’application bancaire, ' +
      'valider le virement, puis déposer le relevé camt.053 du lendemain dans le CRM. ' +
      'L’écriture doit apparaître dans « Rapprochement bancaire » avec sa référence intacte.',
  );

  const resultat = attacherQrBill(doc, {
    montant: MONTANT,
    reference,
    message: 'Test de paiement — CRM Digital Detectives',
  });

  if (!resultat.ajoutee) {
    console.error('Section paiement non produite :', expliquerAbsence(resultat));
    process.exit(1);
  }

  doc.end();
  fs.writeFileSync(SORTIE, await fini);
  console.log(`\nÉcrit : ${SORTIE}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Échec :', e);
  process.exit(1);
});
