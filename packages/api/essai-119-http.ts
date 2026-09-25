/**
 * Essai des routes HTTP /api/v1/banking/* contre l'API réellement en cours
 * d'exécution, avec un jeton admin signé localement.
 *
 * Complète essai-119.ts (qui exerce les services) en vérifiant la couche
 * transport : montage des routes, garde de rôle, forme des réponses.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from './src/shared/prisma.js';

const BASE = 'http://localhost:3000/api/v1/banking';

let echecs = 0;
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) console.log(`  ✅ ${libelle}`);
  else {
    echecs += 1;
    console.error(`  ❌ ${libelle}${detail ? `\n     → ${detail}` : ''}`);
  }
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Aucun administrateur en base');

  // Même repli que src/shared/middlewares/authenticate.ts
  const secret = process.env.JWT_SECRET || 'supersecret';

  const token = jwt.sign(
    { userId: admin.id, role: admin.role, sessionId: 'essai-119' },
    secret,
    { expiresIn: '10m' },
  );

  const auth = { Authorization: `Bearer ${token}` };

  // Rôle non admin : la garde doit refuser
  const enqueteur = await prisma.user.findFirst({ where: { role: { not: 'ADMIN' } } });
  if (enqueteur) {
    const jetonFaible = jwt.sign(
      { userId: enqueteur.id, role: enqueteur.role, sessionId: 'essai-119' },
      secret,
      { expiresIn: '10m' },
    );
    const r = await fetch(`${BASE}/stats`, { headers: { Authorization: `Bearer ${jetonFaible}` } });
    verifier(`Un rôle ${enqueteur.role} est refusé sur /banking/stats`, r.status === 403, `reçu ${r.status}`);
  }

  const sansJeton = await fetch(`${BASE}/stats`);
  verifier('Sans jeton, la route est refusée', sansJeton.status === 401, `reçu ${sansJeton.status}`);

  const stats = await fetch(`${BASE}/stats`, { headers: auth });
  const corpsStats = await stats.json();
  verifier('GET /banking/stats répond 200 à un ADMIN', stats.status === 200, JSON.stringify(corpsStats));
  console.log('     ', JSON.stringify(corpsStats));

  const comptes = await fetch(`${BASE}/accounts`, { headers: auth });
  const corpsComptes = await comptes.json();
  verifier('GET /banking/accounts liste le compte suivi', comptes.status === 200 && Array.isArray(corpsComptes) && corpsComptes.length > 0);
  if (Array.isArray(corpsComptes) && corpsComptes[0]) {
    console.log(`      compte ${corpsComptes[0].iban} — connecteur ${corpsComptes[0].provider}`);
  }

  const tx = await fetch(`${BASE}/transactions`, { headers: auth });
  const corpsTx = await tx.json();
  const liste = Array.isArray(corpsTx) ? corpsTx : corpsTx.items ?? corpsTx.transactions ?? [];
  verifier('GET /banking/transactions renvoie la file d’écritures', tx.status === 200 && liste.length > 0, `${liste.length} écriture(s)`);

  const suggérée = liste.find((e: { status: string }) => e.status === 'SUGGESTED');
  if (suggérée) {
    const cands = await fetch(`${BASE}/transactions/${suggérée.id}/candidates`, { headers: auth });
    const corpsCands = await cands.json();
    verifier(
      'GET /banking/transactions/:id/candidates renvoie des candidats',
      cands.status === 200 && Array.isArray(corpsCands) && corpsCands.length > 0,
      JSON.stringify(corpsCands).slice(0, 150),
    );
  }

  // Lecture seule : aucune route d'ordre bancaire ne doit exister.
  // On sonde en GET, non filtré par la protection CSRF, pour distinguer
  // « route absente » (404) de « requête bloquée en amont » (403).
  const interdites = ['/payments', '/transfer', '/orders', '/accounts/1/payments'];
  for (const route of interdites) {
    const r = await fetch(`${BASE}${route}`, { headers: auth });
    verifier(`${route} n’est pas une route de l’API (lecture seule)`, r.status === 404, `reçu ${r.status}`);
  }

  // Et le POST reste bloqué même si l'on tentait d'en fabriquer un
  const post = await fetch(`${BASE}/payments`, { method: 'POST', headers: auth });
  verifier('Un POST vers une route d’ordre bancaire est refusé', post.status === 403 || post.status === 404, `reçu ${post.status}`);

  console.log(echecs === 0 ? '\n✅ Couche HTTP conforme' : `\n❌ ${echecs} échec(s)`);
  await prisma.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('❌', e);
  process.exit(1);
});
