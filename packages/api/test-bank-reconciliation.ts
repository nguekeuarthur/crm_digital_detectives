import 'dotenv/config';
import assert from 'assert';
import { BankTransaction } from '@prisma/client';
import { parseCamtDocument } from './src/modules/banking/camt-parser.js';
import {
  buildQrReference,
  isValidQrReference,
  isValidScorReference,
  mod10Recursive,
  normalizeReference,
} from './src/modules/banking/qr-reference.js';
import {
  ReconciliationService,
  CandidateInvoice,
  AUTO_MATCH_THRESHOLD,
} from './src/modules/banking/reconciliation.service.js';

/**
 * Validation du rapprochement bancaire (issue #119).
 *
 * Ce script ne touche pas la base : il exerce le parseur camt.053, la
 * génération de références QR et le moteur de décision sur un jeu d'écritures
 * représentatif, puis vérifie le critère d'acceptation :
 * « taux de rapprochement automatique > 70 % sur les paiements avec référence ».
 *
 *   Exécution : npx tsx test-bank-reconciliation.ts
 */

let failures = 0;

function check(label: string, assertion: () => void) {
  try {
    assertion();
    console.log(`  ✅ ${label}`);
  } catch (error) {
    failures += 1;
    console.error(`  ❌ ${label}\n     → ${(error as Error).message}`);
  }
}

// ─── Fabriques de données ───────────────────────────────────────────────────

function makeInvoice(params: {
  id: string;
  amount: number;
  quoteReference: string;
  firstName: string;
  lastName: string;
  company?: string;
  paymentReference?: string;
}): CandidateInvoice {
  return {
    id: params.id,
    quoteId: `quote-${params.id}`,
    mandatId: `mandat-${params.id}`,
    amount: params.amount,
    status: 'PENDING',
    pdfPath: null,
    stripeSessionId: null,
    paymentIntentId: null,
    dueDate: null,
    paymentDate: null,
    bankReference: null,
    paymentReference: params.paymentReference ?? null,
    reminderLevel: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    quote: { reference: params.quoteReference },
    mandat: {
      id: `mandat-${params.id}`,
      client: {
        id: `client-${params.id}`,
        firstName: params.firstName,
        lastName: params.lastName,
        company: params.company ?? null,
        email: `${params.firstName}.${params.lastName}@example.ch`.toLowerCase(),
      },
    },
  } as unknown as CandidateInvoice;
}

function makeTransaction(params: {
  id: string;
  amount: number;
  structuredRef?: string;
  remittanceInfo?: string;
  debtorName?: string;
  creditDebit?: 'CRDT' | 'DBIT';
}): BankTransaction {
  return {
    id: params.id,
    bankAccountId: 'account-ubs',
    externalId: params.id,
    bookingDate: new Date('2026-09-08'),
    valueDate: new Date('2026-09-08'),
    amount: params.amount,
    currency: 'CHF',
    creditDebit: params.creditDebit ?? 'CRDT',
    remittanceInfo: params.remittanceInfo ?? null,
    structuredRef: params.structuredRef ?? null,
    endToEndId: null,
    debtorName: params.debtorName ?? null,
    debtorIban: null,
    raw: null,
    status: 'UNMATCHED',
    matchedInvoiceId: null,
    matchScore: null,
    matchMethod: null,
    matchedAt: null,
    matchedById: null,
    suggestions: null,
    ignoredReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as BankTransaction;
}

// ─── 1. Références de paiement suisses ──────────────────────────────────────

function testQrReference() {
  console.log('\n📎 Références de paiement');

  check('Clé de contrôle modulo 10 récursif conforme à la norme ESR', () => {
    // Exemple de référence documenté : 21 00000 00003 13947 14300 09017
    assert.strictEqual(mod10Recursive('21000000000313947143000901'), 7);
  });

  check('Une référence générée fait 27 chiffres et se valide elle-même', () => {
    const reference = buildQrReference('313947143000901');
    assert.match(reference, /^\d{27}$/);
    assert.ok(isValidQrReference(reference), 'la clé de contrôle doit être valide');
  });

  check('Une référence altérée est rejetée', () => {
    const reference = buildQrReference('313947143000901');
    const corrupted = `${reference.slice(0, 26)}${(Number(reference[26]) + 1) % 10}`;
    assert.ok(!isValidQrReference(corrupted));
  });

  check('Les espaces de mise en forme ne cassent pas la comparaison', () => {
    assert.ok(isValidQrReference('21 00000 00003 13947 14300 09017'));
  });

  check('Référence créancier SCOR ISO 11649 validée', () => {
    assert.ok(isValidScorReference('RF18539007547034'), 'RF18539007547034 est une référence SCOR valide');
    assert.ok(!isValidScorReference('RF19539007547034'), 'une clé fausse doit être rejetée');
  });
}

// ─── 2. Parseur camt.053 ────────────────────────────────────────────────────

const CAMT_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>UBS-2026-09-08</MsgId><CreDtTm>2026-09-08T23:00:00</CreDtTm></GrpHdr>
    <Stmt>
      <Id>STMT-2026-09-08</Id>
      <Acct><Id><IBAN>CH5604835012345678009</IBAN></Id><Ccy>CHF</Ccy></Acct>
      <Ntry>
        <Amt Ccy="CHF">2700.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>2026-09-08</Dt></BookgDt>
        <ValDt><Dt>2026-09-08</Dt></ValDt>
        <AcctSvcrRef>UBS-REF-0001</AcctSvcrRef>
        <NtryDtls>
          <TxDtls>
            <Refs><EndToEndId>DD-2026-0007</EndToEndId><AcctSvcrRef>UBS-TX-0001</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">2700.00</Amt>
            <RltdPties>
              <Dbtr><Nm>Etude Bernasconi &amp; Associes</Nm></Dbtr>
              <DbtrAcct><Id><IBAN>CH9300762011623852957</IBAN></Id></DbtrAcct>
            </RltdPties>
            <RmtInf>
              <Strd><CdtrRefInf><Ref>210000000003139471430009017</Ref></CdtrRefInf></Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">12.50</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <BookgDt><Dt>2026-09-08</Dt></BookgDt>
        <AcctSvcrRef>UBS-REF-0002</AcctSvcrRef>
        <AddtlNtryInf>Frais de tenue de compte</AddtlNtryInf>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">3400.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-09-08</Dt></BookgDt>
        <AcctSvcrRef>UBS-REF-0003</AcctSvcrRef>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>UBS-TX-0003A</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">1900.00</Amt>
            <RltdPties><Dbtr><Nm>Fiduciaire Lemanique SA</Nm></Dbtr></RltdPties>
            <RmtInf><Ustrd>Paiement facture DD-2026-0011</Ustrd></RmtInf>
          </TxDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>UBS-TX-0003B</AcctSvcrRef></Refs>
            <Amt Ccy="CHF">1500.00</Amt>
            <RltdPties><Dbtr><Nm>Jean-Marc Progin</Nm></Dbtr></RltdPties>
            <RmtInf><Ustrd>Acompte</Ustrd><Ustrd>mandat surveillance</Ustrd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

function testCamtParser() {
  console.log('\n📄 Parseur camt.053');

  const statements = parseCamtDocument(CAMT_SAMPLE);
  const [statement] = statements;

  check('Le compte et la devise du relevé sont lus', () => {
    assert.strictEqual(statement.iban, 'CH5604835012345678009');
    assert.strictEqual(statement.currency, 'CHF');
  });

  check('Les écritures groupées sont éclatées par transaction', () => {
    // 1 virement QR + 1 débit de frais + 2 sous-écritures d'une écriture groupée
    assert.strictEqual(statement.transactions.length, 4);
  });

  check('La référence QR structurée est préservée sans perte de zéros', () => {
    const qrPayment = statement.transactions.find((tx) => tx.externalId === 'UBS-TX-0001');
    assert.ok(qrPayment, 'écriture QR introuvable');
    assert.strictEqual(qrPayment.structuredRef, '210000000003139471430009017');
    assert.strictEqual(qrPayment.debtorName, 'Etude Bernasconi & Associes');
    assert.strictEqual(qrPayment.amount, 2700);
  });

  check('Le sens débit/crédit est correctement porté', () => {
    const fees = statement.transactions.find((tx) => tx.externalId === 'UBS-REF-0002');
    assert.ok(fees);
    assert.strictEqual(fees.creditDebit, 'DBIT');
    assert.strictEqual(fees.remittanceInfo, 'Frais de tenue de compte');
  });

  check('Les communications multiples sont concaténées', () => {
    const partial = statement.transactions.find((tx) => tx.externalId === 'UBS-TX-0003B');
    assert.ok(partial);
    assert.strictEqual(partial.remittanceInfo, 'Acompte mandat surveillance');
    assert.strictEqual(partial.amount, 1500);
  });
}

// ─── 3. Moteur de rapprochement ─────────────────────────────────────────────

interface Scenario {
  label: string;
  transaction: BankTransaction;
  /** Facture attendue, ou null si l'écriture doit partir en vérification manuelle */
  expectedInvoiceId: string | null;
  referenced: boolean;
  expectAuto: boolean;
}

function buildScenarios(): { invoices: CandidateInvoice[]; scenarios: Scenario[] } {
  const clients = [
    { first: 'Sophie', last: 'Rochat', company: undefined, amount: 2700 },
    { first: 'Marc', last: 'Bertholet', company: 'Bertholet Transports SA', amount: 4000 },
    { first: 'Elena', last: 'Ferrari', company: undefined, amount: 1900 },
    { first: 'Pierre', last: 'Devaud', company: 'Devaud Immobilier Sarl', amount: 3300 },
    { first: 'Nadia', last: 'Kaufmann', company: undefined, amount: 900 },
    { first: 'Laurent', last: 'Progin', company: undefined, amount: 1200 },
    { first: 'Céline', last: 'Baumgartner', company: 'Etude Baumgartner', amount: 5000 },
    { first: 'Thomas', last: 'Hublot', company: undefined, amount: 2300 },
    { first: 'Isabelle', last: 'Chevalley', company: undefined, amount: 1000 },
    { first: 'Rui', last: 'Almeida', company: 'Almeida Construction SA', amount: 800 },
    // Deux factures au même montant, sans référence : cas volontairement ambigu
    { first: 'Anne', last: 'Jaquier', company: undefined, amount: 1500 },
    { first: 'Paul', last: 'Jaquier', company: undefined, amount: 1500 },
  ];

  const invoices = clients.map((client, index) =>
    makeInvoice({
      id: `inv-${String(index + 1).padStart(4, '0')}-a1b2`,
      amount: client.amount,
      quoteReference: `DD-2026-${String(index + 1).padStart(4, '0')}`,
      firstName: client.first,
      lastName: client.last,
      company: client.company,
      paymentReference: buildQrReference(`${9000000 + index}`),
    }),
  );

  const scenarios: Scenario[] = [];

  // a) Paiements QR : la banque restitue la référence structurée (cas nominal)
  invoices.slice(0, 5).forEach((invoice, index) => {
    scenarios.push({
      label: `QR ${invoice.quote!.reference}`,
      transaction: makeTransaction({
        id: `tx-qr-${index}`,
        amount: invoice.amount,
        structuredRef: invoice.paymentReference!,
        debtorName: invoice.mandat.client.company || `${invoice.mandat.client.firstName} ${invoice.mandat.client.lastName}`,
      }),
      expectedInvoiceId: invoice.id,
      referenced: true,
      expectAuto: true,
    });
  });

  // b) Virements e-banking avec la référence du devis recopiée
  invoices.slice(5, 9).forEach((invoice, index) => {
    scenarios.push({
      label: `Communication ${invoice.quote!.reference}`,
      transaction: makeTransaction({
        id: `tx-ref-${index}`,
        amount: invoice.amount,
        remittanceInfo: `Paiement facture ${invoice.quote!.reference} merci`,
        debtorName: `${invoice.mandat.client.firstName} ${invoice.mandat.client.lastName}`,
      }),
      expectedInvoiceId: invoice.id,
      referenced: true,
      expectAuto: true,
    });
  });

  // c) Acompte : référence correcte mais montant partiel → jamais soldé d'office
  scenarios.push({
    label: 'Acompte partiel avec référence QR',
    transaction: makeTransaction({
      id: 'tx-partial',
      amount: invoices[9].amount / 2,
      structuredRef: invoices[9].paymentReference!,
      debtorName: invoices[9].mandat.client.company!,
    }),
    expectedInvoiceId: null,
    referenced: true,
    expectAuto: false,
  });

  // d) Virement sans référence, nom du donneur d'ordre exact
  scenarios.push({
    label: 'Sans référence, nom exact',
    transaction: makeTransaction({
      id: 'tx-name',
      amount: invoices[2].amount,
      remittanceInfo: 'Virement',
      debtorName: `${invoices[2].mandat.client.firstName} ${invoices[2].mandat.client.lastName}`,
    }),
    expectedInvoiceId: invoices[2].id,
    referenced: false,
    expectAuto: true,
  });

  // e) Nom tronqué par la banque : correspondance partielle → vérification humaine
  scenarios.push({
    label: 'Sans référence, nom tronqué',
    transaction: makeTransaction({
      id: 'tx-truncated',
      amount: invoices[4].amount,
      debtorName: 'KAUFM',
    }),
    expectedInvoiceId: null,
    referenced: false,
    expectAuto: false,
  });

  // f) Deux factures au même montant et patronyme commun : ambiguïté assumée
  scenarios.push({
    label: 'Montant ambigu entre deux factures',
    transaction: makeTransaction({
      id: 'tx-ambiguous',
      amount: 1500,
      debtorName: 'Jaquier',
    }),
    expectedInvoiceId: null,
    referenced: false,
    expectAuto: false,
  });

  // g) Frais bancaires au débit : ne solde jamais une facture
  scenarios.push({
    label: 'Frais bancaires (débit)',
    transaction: makeTransaction({
      id: 'tx-fees',
      amount: 12.5,
      creditDebit: 'DBIT',
      remittanceInfo: 'Frais de tenue de compte',
    }),
    expectedInvoiceId: null,
    referenced: false,
    expectAuto: false,
  });

  // h) Virement d'un tiers inconnu : file d'attente
  scenarios.push({
    label: 'Tiers inconnu',
    transaction: makeTransaction({
      id: 'tx-unknown',
      amount: 480,
      debtorName: 'Assurance Helvetia Generale',
      remittanceInfo: 'Remboursement note de frais',
    }),
    expectedInvoiceId: null,
    referenced: false,
    expectAuto: false,
  });

  return { invoices, scenarios };
}

function testReconciliationEngine() {
  console.log('\n🏦 Moteur de rapprochement');

  const { invoices, scenarios } = buildScenarios();

  const results = scenarios.map((scenario) => ({
    scenario,
    decision: ReconciliationService.decide(scenario.transaction, invoices),
  }));

  // Détail lisible pour le rapport de stage / la revue
  console.log(`\n  Seuil d'auto-rapprochement : ${AUTO_MATCH_THRESHOLD}`);
  console.log('  ┌─────────────────────────────────────────┬────────────┬───────┬──────────────────────┐');
  console.log('  │ Scénario                                │ Décision   │ Score │ Méthode              │');
  console.log('  ├─────────────────────────────────────────┼────────────┼───────┼──────────────────────┤');
  for (const { scenario, decision } of results) {
    const score = decision.winner ? decision.winner.score.toFixed(2) : '—';
    const method = decision.winner?.method ?? '—';
    console.log(
      `  │ ${scenario.label.padEnd(39).slice(0, 39)} │ ${decision.outcome.padEnd(10)} │ ${score.padStart(5)} │ ${method.padEnd(20)} │`,
    );
  }
  console.log('  └─────────────────────────────────────────┴────────────┴───────┴──────────────────────┘\n');

  check('Chaque rapprochement automatique vise la bonne facture (aucun faux positif)', () => {
    for (const { scenario, decision } of results) {
      if (decision.outcome !== 'auto') continue;
      assert.strictEqual(
        decision.winner?.invoiceId,
        scenario.expectedInvoiceId,
        `"${scenario.label}" a été rapprochée de ${decision.winner?.invoiceId} au lieu de ${scenario.expectedInvoiceId}`,
      );
    }
  });

  check("Aucune écriture attendue en vérification manuelle n'est soldée d'office", () => {
    for (const { scenario, decision } of results) {
      if (scenario.expectAuto) continue;
      assert.notStrictEqual(decision.outcome, 'auto', `"${scenario.label}" n'aurait pas dû être auto-rapprochée`);
    }
  });

  check('Un acompte (montant partiel) reste proposé, jamais validé', () => {
    const partial = results.find((result) => result.scenario.transaction.id === 'tx-partial')!;
    assert.strictEqual(partial.decision.outcome, 'suggested');
    assert.ok(partial.decision.winner!.score < AUTO_MATCH_THRESHOLD);
  });

  check('Les écritures au débit ne sont jamais rapprochées', () => {
    const fees = results.find((result) => result.scenario.transaction.id === 'tx-fees')!;
    assert.strictEqual(fees.decision.outcome, 'ignored');
  });

  check('Un virement ambigu part en vérification manuelle', () => {
    const ambiguous = results.find((result) => result.scenario.transaction.id === 'tx-ambiguous')!;
    assert.notStrictEqual(ambiguous.decision.outcome, 'auto');
  });

  check("La détection des paiements référencés est correcte", () => {
    for (const { scenario } of results) {
      assert.strictEqual(
        ReconciliationService.carriesCrmReference(scenario.transaction),
        scenario.referenced,
        `mauvaise détection de référence pour "${scenario.label}"`,
      );
    }
  });

  // ─── Critère d'acceptation de l'issue #119 ───
  const referenced = results.filter((result) => result.scenario.referenced);
  const referencedAuto = referenced.filter((result) => result.decision.outcome === 'auto');
  const rate = referencedAuto.length / referenced.length;

  const credits = results.filter((result) => result.scenario.transaction.creditDebit === 'CRDT');
  const globalRate = credits.filter((result) => result.decision.outcome === 'auto').length / credits.length;

  console.log(`  📊 Paiements référencés         : ${referenced.length}`);
  console.log(`  📊 Rapprochés automatiquement   : ${referencedAuto.length}`);
  console.log(`  📊 Taux sur paiements référencés: ${(rate * 100).toFixed(1)} % (objectif > 70 %)`);
  console.log(`  📊 Taux global sur les crédits  : ${(globalRate * 100).toFixed(1)} %\n`);

  check('Critère #119 : taux de rapprochement automatique > 70 % sur les paiements référencés', () => {
    assert.ok(rate > 0.7, `taux mesuré : ${(rate * 100).toFixed(1)} %`);
  });
}

// ─── 4. Boucle complète facture → relevé bancaire ───────────────────────────

/**
 * La chaîne n'a de valeur que si la référence attribuée à la facture (et
 * imprimée sur le PDF envoyé au client) est exactement celle que la banque
 * restitue dans le camt.053. On rejoue ici ce trajet de bout en bout.
 */
function testInvoiceToStatementLoop() {
  console.log('\n🔗 Boucle facture → relevé bancaire');

  // Référence telle que l'attribue ensureInvoicePaymentReference()
  const invoiceId = 'b3f1e9d2-0000-4000-8000-000000000001';
  const seed = BigInt(`0x${invoiceId.replace(/-/g, '').slice(0, 15)}`).toString().slice(0, 20);
  const reference = buildQrReference(seed);

  check('La référence imprimée sur la facture est une référence QR valide', () => {
    assert.ok(isValidQrReference(reference), reference);
  });

  const camt = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Id>ST-LOOP</Id>
      <Acct><Id><IBAN>CH5604835012345678009</IBAN></Id><Ccy>CHF</Ccy></Acct>
      <Ntry>
        <NtryRef>LOOP-0001</NtryRef>
        <Amt Ccy="CHF">2450.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-09-11</Dt></BookgDt>
        <ValDt><Dt>2026-09-11</Dt></ValDt>
        <NtryDtls><TxDtls>
          <RltdPties><Dbtr><Nm>Jean Martin</Nm></Dbtr></RltdPties>
          <RmtInf><Strd><CdtrRefInf><Ref>${reference}</Ref></CdtrRefInf></Strd></RmtInf>
        </TxDtls></NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

  const transactions = parseCamtDocument(Buffer.from(camt, 'utf8')).flatMap((s) => s.transactions);

  check('La banque restitue la référence à l’identique dans le camt.053', () => {
    assert.strictEqual(transactions.length, 1);
    assert.strictEqual(
      normalizeReference(transactions[0].structuredRef),
      normalizeReference(reference)
    );
  });
}

// ─── Exécution ──────────────────────────────────────────────────────────────

console.log('🚀 Validation du rapprochement bancaire (issue #119)');

testQrReference();
testCamtParser();
testReconciliationEngine();
testInvoiceToStatementLoop();

if (failures > 0) {
  console.error(`\n❌ ${failures} vérification(s) en échec.`);
  process.exit(1);
}

console.log('✅ Toutes les vérifications sont passées.');
process.exit(0);
