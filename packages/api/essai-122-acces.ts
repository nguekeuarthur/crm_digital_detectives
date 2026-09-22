/**
 * Vérifie le contrôle d'accès des routes de signature (issue #122).
 *
 * Un enquêteur ne doit agir que sur les contrats des mandats qui lui sont
 * assignés. La règle ne peut se vérifier que par HTTP : c'est un middleware.
 *
 * Aucun appel externe — le connecteur reste en simulation. Les données créées
 * sont supprimées à la fin.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from './src/shared/prisma.js';

const BASE = 'http://localhost:3000/api/v1';
const EMAIL_ESSAI = 'essai-122-acces@example.invalid';

let echecs = 0;
const verifier = (l: string, c: boolean, d = '') => {
  if (c) console.log(`  ✅ ${l}`);
  else {
    echecs += 1;
    console.error(`  ❌ ${l}${d ? `\n     → ${d}` : ''}`);
  }
};

async function main() {
  const secret = process.env.JWT_SECRET || 'supersecret';
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const enqueteurs = await prisma.user.findMany({ where: { role: 'ENQUETEUR' }, take: 2 });

  if (!admin || enqueteurs.length < 1) {
    throw new Error('Il faut au moins un ADMIN et un ENQUETEUR en base');
  }
  const assigne = enqueteurs[0];
  const etranger = enqueteurs[1] ?? null;

  const jetonDe = (u: { id: string; role: string }) =>
    jwt.sign({ userId: u.id, role: u.role, sessionId: 'acces' }, secret, { expiresIn: '10m' });

  const amorce = await fetch('http://localhost:3000/health');
  const csrf = /csrfToken=([^;]+)/.exec(amorce.headers.get('set-cookie') || '')?.[1] ?? '';
  const entetes = (u: { id: string; role: string }) => ({
    Authorization: `Bearer ${jetonDe(u)}`,
    'Content-Type': 'application/json',
    'x-csrf-token': csrf,
    Cookie: `csrfToken=${csrf}`,
  });

  // ─── Jeu d'essai : un mandat assigné à `assigne` ──────────────────────────
  const ancien = await prisma.client.findUnique({
    where: { email: EMAIL_ESSAI },
    include: { mandats: true },
  });
  if (ancien) {
    for (const m of ancien.mandats) {
      await prisma.contract.deleteMany({ where: { mandatId: m.id } });
      const ds = await prisma.dossier.findMany({ where: { mandatId: m.id } });
      for (const d of ds) await prisma.file.deleteMany({ where: { folderId: d.id } });
      await prisma.dossier.deleteMany({ where: { mandatId: m.id } });
      await prisma.activity.deleteMany({ where: { mandatId: m.id } });
      await prisma.mandat.delete({ where: { id: m.id } });
    }
  }

  const client = await prisma.client.upsert({
    where: { email: EMAIL_ESSAI },
    update: {},
    create: { email: EMAIL_ESSAI, firstName: 'Accès', lastName: 'Essai 122', status: 'ACTIF' },
  });
  const mandat = await prisma.mandat.create({
    data: { title: 'Mandat — essai accès 122', clientId: client.id, enqueteurId: assigne.id },
  });
  const dossier = await prisma.dossier.create({
    data: { name: 'Contrats et Administratif', mandatId: mandat.id },
  });
  const fichier = await prisma.file.create({
    data: {
      name: 'Contrat_acces.pdf',
      key: 'essai/acces.pdf',
      size: 100,
      mimeType: 'application/pdf',
      folderId: dossier.id,
    },
  });
  const template = await prisma.contractTemplate.create({
    data: { name: 'Modèle accès 122', htmlContent: '<p>x</p>' },
  });
  const contrat = await prisma.contract.create({
    data: { mandatId: mandat.id, templateId: template.id, fileId: fichier.id },
  });

  console.log(`\nMandat assigné à ${assigne.email} — contrat ${contrat.id.slice(0, 8)}\n`);

  const envoyer = (u: { id: string; role: string }) =>
    fetch(`${BASE}/contracts/${contrat.id}/send-for-signature`, {
      method: 'POST',
      headers: entetes(u),
      body: '{}',
    });

  // ─── Les trois cas qui comptent ───────────────────────────────────────────
  if (etranger) {
    const r = await envoyer(etranger);
    verifier(
      'Un enquêteur NON assigné au mandat est refusé (403)',
      r.status === 403,
      `reçu ${r.status} — ${(await r.text()).slice(0, 140)}`,
    );
    const trace = await prisma.auditLog.findFirst({
      where: { action: 'ACCESS_DENIED', entity: 'Contract', entityId: contrat.id },
    });
    verifier('La tentative refusée est journalisée', trace !== null);
  } else {
    console.log('  (un seul ENQUETEUR en base : cas « non assigné » non exercé)');
  }

  const rAdmin = await fetch(`${BASE}/contracts/${contrat.id}/withdraw-signature`, {
    method: 'POST',
    headers: entetes(admin),
    body: '{}',
  });
  verifier(
    'Un ADMIN passe le contrôle d’accès (pas de 403)',
    rAdmin.status !== 403,
    `reçu ${rAdmin.status}`,
  );

  const rInconnu = await fetch(`${BASE}/contracts/00000000-0000-4000-8000-000000000000/send-for-signature`, {
    method: 'POST',
    headers: entetes(etranger ?? assigne),
    body: '{}',
  });
  verifier(
    'Un contrat inexistant répond 404, pas 500',
    rInconnu.status === 404 || (rInconnu.status === 403 && !etranger),
    `reçu ${rInconnu.status}`,
  );

  // ─── Nettoyage ────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany({ where: { entityId: contrat.id } });
  await prisma.contract.deleteMany({ where: { mandatId: mandat.id } });
  await prisma.contractTemplate.delete({ where: { id: template.id } });
  await prisma.file.deleteMany({ where: { folderId: dossier.id } });
  await prisma.dossier.delete({ where: { id: dossier.id } });
  await prisma.activity.deleteMany({ where: { mandatId: mandat.id } });
  await prisma.mandat.delete({ where: { id: mandat.id } });
  await prisma.client.delete({ where: { id: client.id } });

  console.log(echecs === 0 ? '\n✅ Contrôle d’accès conforme' : `\n❌ ${echecs} échec(s)`);
  await prisma.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
