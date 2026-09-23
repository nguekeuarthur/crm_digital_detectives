import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from './src/shared/prisma.js';

const BASE = 'http://localhost:3000/api/v1';
let echecs = 0;
const verifier = (l: string, c: boolean, d = '') => {
  if (c) console.log(`  ✅ ${l}`);
  else { echecs++; console.error(`  ❌ ${l}${d ? `\n     → ${d}` : ''}`); }
};

async function main() {
  const secret = process.env.JWT_SECRET || 'supersecret';
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const auth = { Authorization: `Bearer ${jwt.sign({ userId: admin!.id, role: 'ADMIN', sessionId: 'suivi' }, secret, { expiresIn: '10m' })}` };

  // ── Les deux routes que l'écran appelle au chargement ────────────────────
  const stats = await fetch(`${BASE}/contracts/signature-stats`, { headers: auth });
  const s = await stats.json();
  verifier('GET /contracts/signature-stats répond 200', stats.status === 200, JSON.stringify(s).slice(0, 180));
  verifier('Les compteurs par état sont présents',
    ['total', 'brouillon', 'enAttente', 'signes', 'refuses', 'enErreur'].every(k => typeof s[k] === 'number'),
    JSON.stringify(s));
  verifier('Le connecteur et les niveaux sont exposés',
    Boolean(s.connecteur && s.qualite && s.qualiteMinimale),
    `${s.connecteur} / ${s.qualite} / min ${s.qualiteMinimale}`);
  console.log('     ', JSON.stringify(s));

  const liste = await fetch(`${BASE}/contracts?limite=50`, { headers: auth });
  const l = await liste.json();
  verifier('GET /contracts répond 200', liste.status === 200, JSON.stringify(l).slice(0, 180));
  verifier('La réponse est paginée', typeof l.total === 'number' && Array.isArray(l.items));

  const premier = l.items?.[0];
  if (premier) {
    verifier('Chaque ligne porte client, mandat et état',
      Boolean(premier.mandat?.client && premier.mandat?.title && premier.status));
    verifier('Le jeton de rappel n’est JAMAIS exposé',
      !('callbackToken' in premier),
      `clés : ${Object.keys(premier).join(', ')}`);
    console.log(`      ${l.items.length} contrat(s) — ex. « ${premier.mandat.title} » → ${premier.status}`);
  } else {
    console.log('      (aucun contrat en base)');
  }

  // ── Filtres utilisés par les onglets ─────────────────────────────────────
  for (const statut of ['DRAFT', 'SENT', 'SIGNED', 'DECLINED']) {
    const r = await fetch(`${BASE}/contracts?statut=${statut}`, { headers: auth });
    const c = await r.json();
    const homogene = (c.items ?? []).every((x: { status: string }) => x.status === statut);
    verifier(`Filtre ${statut} : réponse 200 et homogène`, r.status === 200 && homogene, `${c.items?.length ?? 0} ligne(s)`);
  }

  const recherche = await fetch(`${BASE}/contracts?recherche=Rochat`, { headers: auth });
  verifier('La recherche par nom répond 200', recherche.status === 200, `reçu ${recherche.status}`);

  const invalide = await fetch(`${BASE}/contracts?statut=INEXISTANT`, { headers: auth });
  verifier('Un statut inconnu est rejeté', invalide.status >= 400, `reçu ${invalide.status}`);

  const sansAuth = await fetch(`${BASE}/contracts`);
  verifier('La liste exige une authentification', sansAuth.status === 401, `reçu ${sansAuth.status}`);

  console.log(echecs === 0 ? '\n✅ Données de l’écran de suivi conformes' : `\n❌ ${echecs} échec(s)`);
  await prisma.$disconnect();
  process.exit(echecs === 0 ? 0 : 1);
}
main().catch((e) => { console.error('❌', e); process.exit(1); });
