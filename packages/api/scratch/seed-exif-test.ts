import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Minimal valid 1x1 PNG (rouge) — suffisant pour que la visionneuse affiche quelque chose
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Coordonnées GPS — Place du Bourg-de-Four, Genève
const GEO = { lat: 46.2017, lng: 6.1503 };

const EXIF = {
  DateTimeOriginal: '2026-05-15T14:32:00.000Z',
  latitude: GEO.lat,
  longitude: GEO.lng,
  GPSLatitude: GEO.lat,
  GPSLongitude: GEO.lng,
  Make: 'Canon',
  Model: 'EOS R5',
  Software: 'Digital Photo Professional 4.18.20',
};

function encrypt(buffer: Buffer): Buffer {
  const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default_key_of_32_characters_1234', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

async function main() {
  console.log('🌱 Seeding données de test EXIF (Issue #99)...\n');

  // 1. Admin user
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@digitaldetective.ch',
        password: await bcrypt.hash('Admin1234!', 10),
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin créé : ${admin.email} / Admin1234!`);
  } else {
    console.log(`✅ Admin existant : ${admin.email}`);
  }

  // 2. Client de test
  const client = await prisma.client.upsert({
    where: { email: 'suspect-test@example.ch' },
    create: {
      email: 'suspect-test@example.ch',
      firstName: 'Jean-Pierre',
      lastName: 'Dupont',
      company: 'Dupont SA',
      status: 'ACTIF',
    },
    update: {},
  });
  console.log(`✅ Client : ${client.firstName} ${client.lastName} (${client.id})`);

  // 3. Mandat
  const mandat = await prisma.mandat.create({
    data: {
      title: 'Surveillance Place du Bourg-de-Four — Test #99',
      description: 'Mandat de test pour la visionneuse de preuves avec métadonnées EXIF',
      status: 'ACTIVE',
      clientId: client.id,
      enqueteurId: admin.id,
    },
  });
  console.log(`✅ Mandat : ${mandat.title} (${mandat.id})`);

  // 4. Dossier preuves
  const dossier = await prisma.dossier.create({
    data: {
      name: 'Preuves photographiques',
      mandatId: mandat.id,
      isSystem: false,
    },
  });
  console.log(`✅ Dossier : ${dossier.name} (${dossier.id})`);

  // 5. Chiffrer et stocker le fichier image de test
  const storageBase = process.env.STORAGE_PATH || './uploads';
  const key = `mandats/${mandat.id}/${dossier.id}/${Date.now()}-preuve-bourg-de-four.png`;
  const fullDir = path.join(storageBase, path.dirname(key));
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  fs.writeFileSync(path.join(storageBase, key), encrypt(TINY_PNG));
  console.log(`✅ Fichier chiffré : ${key}`);

  // 6. Enregistrement en DB avec EXIF + GPS
  const file = await prisma.file.create({
    data: {
      name: 'preuve-bourg-de-four.png',
      key,
      size: TINY_PNG.length,
      mimeType: 'image/png',
      folderId: dossier.id,
      userId: admin.id,
      exifData: EXIF,
      geoLat: GEO.lat,
      geoLng: GEO.lng,
    },
  });
  console.log(`✅ Fichier DB : ${file.id} — GPS (${GEO.lat}, ${GEO.lng})`);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  ✅ Données de test créées avec succès !                 ║
╠══════════════════════════════════════════════════════════╣
║  Connexion :                                             ║
║    Email    : admin@digitaldetective.ch                  ║
║    Mot de passe : Admin1234!                             ║
╠══════════════════════════════════════════════════════════╣
║  Pour tester la visionneuse EXIF :                       ║
║  1. Démarre l'API et le frontend                         ║
║  2. Connecte-toi avec les identifiants ci-dessus         ║
║  3. Va sur "Clients & Mandats"                           ║
║  4. Trouve le mandat "Surveillance Place du Bourg…"      ║
║  5. Clique sur l'icône carte 🗺️                          ║
║  6. Clique "Ouvrir la visionneuse" sur le marqueur       ║
╚══════════════════════════════════════════════════════════╝
`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
