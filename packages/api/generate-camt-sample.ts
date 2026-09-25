import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { buildQrReference } from './src/modules/banking/qr-reference.js';

/**
 * Génère un relevé camt.053 d'ENTRAÎNEMENT à partir des factures réellement en
 * attente dans le CRM.
 *
 * Objectif : répéter tout le flux de la voie A (dépôt du relevé → import →
 * rapprochement → file d'attente) avant de manipuler un vrai relevé UBS.
 *
 *   npx tsx generate-camt-sample.ts [IBAN]
 *
 * Le fichier produit est explicitement marqué « ECHANTILLON-TEST » : il ne doit
 * jamais être confondu avec un relevé bancaire authentique.
 */

const prisma = new PrismaClient();
const IBAN = process.argv[2] || process.env.BANK_MOCK_IBAN || 'CH5604835012345678009';
const OUTPUT_DIR = process.env.BANK_CAMT_IMPORT_DIR || './storage/bank-import';

/** Échappe les caractères réservés XML des libellés bancaires */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function entry(params: {
  reference: string;
  amount: number;
  creditDebit: 'CRDT' | 'DBIT';
  date: string;
  debtorName?: string;
  structuredRef?: string;
  remittance?: string;
}): string {
  const details = params.debtorName
    ? `
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>${params.reference}</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">${params.amount.toFixed(2)}</Amt>
            <RltdPties>
              <Dbtr><Nm>${escapeXml(params.debtorName)}</Nm></Dbtr>
              <DbtrAcct><Id><IBAN>CH9300762011623852957</IBAN></Id></DbtrAcct>
            </RltdPties>
            <RmtInf>${
              params.structuredRef
                ? `<Strd><CdtrRefInf><Ref>${params.structuredRef}</Ref></CdtrRefInf></Strd>`
                : ''
            }${params.remittance ? `<Ustrd>${escapeXml(params.remittance)}</Ustrd>` : ''}</RmtInf>
          </TxDtls>
        </NtryDtls>`
    : '';

  return `
      <Ntry>
        <Amt Ccy="CHF">${params.amount.toFixed(2)}</Amt>
        <CdtDbtInd>${params.creditDebit}</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>${params.date}</Dt></BookgDt>
        <ValDt><Dt>${params.date}</Dt></ValDt>
        <AcctSvcrRef>${params.reference}</AcctSvcrRef>${
          params.remittance && !params.debtorName ? `\n        <AddtlNtryInf>${escapeXml(params.remittance)}</AddtlNtryInf>` : ''
        }${details}
      </Ntry>`;
}

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { status: 'PENDING' },
    include: { quote: { select: { reference: true } }, mandat: { include: { client: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!invoices.length) {
    console.error(
      "❌ Aucune facture en attente dans le CRM.\n" +
        "   Créez d'abord un devis et acceptez-le (une facture PENDING est alors générée),\n" +
        '   puis relancez ce script.',
    );
    process.exitCode = 1;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const entries: string[] = [];

  console.log(`📄 Génération d'un relevé d'entraînement pour ${invoices.length} facture(s) en attente :\n`);

  invoices.forEach((invoice, index) => {
    const client = invoice.mandat.client;
    const clientName = client.company || `${client.firstName} ${client.lastName}`;
    const quoteReference = invoice.quote?.reference ?? `FAC-${invoice.id.slice(0, 8).toUpperCase()}`;

    // On alterne les trois qualités de paiement rencontrées en production
    if (index % 3 === 0) {
      const structuredRef = invoice.paymentReference || buildQrReference(`${9000000 + index}`);
      entries.push(
        entry({
          reference: `TEST-QR-${index}`,
          amount: invoice.amount,
          creditDebit: 'CRDT',
          date: today,
          debtorName: clientName,
          structuredRef,
        }),
      );
      console.log(`   • ${quoteReference} — paiement QR référencé (rapprochement automatique attendu)`);
    } else if (index % 3 === 1) {
      entries.push(
        entry({
          reference: `TEST-REF-${index}`,
          amount: invoice.amount,
          creditDebit: 'CRDT',
          date: today,
          debtorName: clientName,
          remittance: `Paiement facture ${quoteReference}`,
        }),
      );
      console.log(`   • ${quoteReference} — référence recopiée dans la communication (automatique attendu)`);
    } else {
      entries.push(
        entry({
          reference: `TEST-NOM-${index}`,
          amount: invoice.amount,
          creditDebit: 'CRDT',
          date: today,
          debtorName: clientName.slice(0, 9).toUpperCase(),
          remittance: 'Virement',
        }),
      );
      console.log(`   • ${quoteReference} — nom tronqué, sans référence (vérification manuelle attendue)`);
    }
  });

  // Bruit réaliste : doit atterrir en « écartée » et en « à vérifier »
  entries.push(
    entry({ reference: 'TEST-FRAIS', amount: 12.5, creditDebit: 'DBIT', date: today, remittance: 'Frais de tenue de compte' }),
    entry({
      reference: 'TEST-INCONNU',
      amount: 480,
      creditDebit: 'CRDT',
      date: today,
      debtorName: 'Fiduciaire Lemanique SA',
      remittance: 'Remboursement note de frais',
    }),
  );
  console.log('   • Frais bancaires au débit (écartée attendue)');
  console.log('   • Virement d\'un tiers inconnu (vérification manuelle attendue)');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>ECHANTILLON-TEST-${today}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <AddtlInf>ECHANTILLON DE TEST GENERE PAR LE CRM - NE PAS CONFONDRE AVEC UN RELEVE BANCAIRE</AddtlInf>
    </GrpHdr>
    <Stmt>
      <Id>ECHANTILLON-TEST-${today}</Id>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <Acct><Id><IBAN>${IBAN}</IBAN></Id><Ccy>CHF</Ccy></Acct>${entries.join('')}
    </Stmt>
  </BkToCstmrStmt>
</Document>
`;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, `ECHANTILLON-TEST-camt053-${today}.xml`);
  fs.writeFileSync(filePath, xml, 'utf8');

  console.log(`\n✅ Relevé d'entraînement écrit dans ${filePath}`);
  console.log('   Lancez la synchronisation depuis l\'écran « Rapprochement bancaire »,');
  console.log(`   après avoir déclaré le compte ${IBAN}.`);
}

main()
  .catch((error) => {
    console.error('❌ Échec :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
