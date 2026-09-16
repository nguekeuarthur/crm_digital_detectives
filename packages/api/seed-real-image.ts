// IMPORTANT: dotenv doit être chargé AVANT tout import qui utilise process.env
import dotenv from 'dotenv';
dotenv.config();

const { PrismaClient } = await import('@prisma/client');
const fs = await import('fs');
const { StorageService } = await import('./src/modules/file/storage.service');

const prisma = new PrismaClient();

async function run() {
  console.log('🌱 [FIX] Correction de la preuve géolocalisée...');
  console.log('🔑 ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

  // Le fichier exact qui est affiché dans l'UI
  const TARGET_ID = 'd9161039-ab8e-45db-a792-1fd4fef579e1';

  const dbFile = await prisma.file.findUnique({ where: { id: TARGET_ID } });
  if (!dbFile) {
    console.error('❌ Fichier non trouvé en base.');
    return;
  }

  console.log('📄 Enregistrement actuel:', dbFile.name, '|', dbFile.key, '|', dbFile.mimeType, '|', dbFile.size);

  // L'image source (c'est un JPEG malgré l'extension .png)
  const srcPath = '/Users/edimaevinawilfriedbryan/.gemini/antigravity-ide/brain/86310776-33e3-4d06-8526-79393bd811b2/surveillance_proof_1779878266809.png';
  const imageBuffer = fs.readFileSync(srcPath);
  console.log('📷 Image source: JPEG,', imageBuffer.length, 'octets');

  // Nouvelle clé avec extension .jpg
  const newKey = 'mandats/ccb6a948-b1a0-4254-9655-c2bc95e9e319/74b89f61-bc2a-453c-bf0f-5ea5c2c7f645/preuve_surveillance_parc.jpg';

  // Mise à jour BDD
  await prisma.file.update({
    where: { id: TARGET_ID },
    data: {
      name: 'preuve_surveillance_parc.jpg',
      key: newKey,
      mimeType: 'image/jpeg',
      size: imageBuffer.length
    }
  });
  console.log('✅ BDD mise à jour');

  // Stocker le fichier chiffré
  await StorageService.uploadFile(newKey, imageBuffer, 'image/jpeg');
  console.log('✅ Fichier stocké et chiffré');

  // Vérification immédiate
  const decrypted = await StorageService.getFile(newKey);
  const isJpeg = decrypted[0] === 0xFF && decrypted[1] === 0xD8 && decrypted[2] === 0xFF;
  console.log(`✅ Vérification: ${decrypted.length} octets | JPEG valide: ${isJpeg} | Tailles identiques: ${imageBuffer.length === decrypted.length}`);

  // Relire l'enregistrement final
  const final = await prisma.file.findUnique({ where: { id: TARGET_ID } });
  console.log('📄 Enregistrement final:', final?.name, '|', final?.key, '|', final?.mimeType, '|', final?.size);
}

run()
  .catch(err => console.error('❌ Erreur:', err))
  .finally(() => prisma.$disconnect());
