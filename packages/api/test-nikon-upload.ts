import 'dotenv/config';
import { prisma } from './src/shared/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function runTest() {
  console.log('🏁 [TEST NIKON UPLOAD] Démarrage de la simulation d\'importation Nikon Cloud...');

  // 1. Trouver le mandat cible pour le test
  const mandate = await prisma.mandat.findFirst({
    where: {
      OR: [
        { id: '1777980867530' },
        { id: 'ccb6a948-b1a0-4254-9655-c2bc95e9e319' },
        { title: { contains: '1777980867530' } }
      ]
    }
  });

  if (!mandate) {
    console.error('❌ Mandat de test introuvable en BDD.');
    console.log('💡 Veuillez d\'abord vous assurer que la base est correctement initialisée.');
    return;
  }

  // 2. Trouver l\'image de preuve avec métadonnées EXIF dans le dossier brain
  const brainDir = '/Users/edimaevinawilfriedbryan/.gemini/antigravity-ide/brain/86310776-33e3-4d06-8526-79393bd811b2';
  const imageNames = ['surveillance_proof_1779878266809.png', 'geneva_surveillance_photo_1779877684853.png'];
  let imageBuffer: Buffer | null = null;
  let selectedName = '';

  for (const name of imageNames) {
    try {
      const path = join(brainDir, name);
      imageBuffer = await readFile(path);
      selectedName = name;
      console.log(`📸 Image source trouvée : ${name}`);
      break;
    } catch {
      // Ignorer et essayer la suivante
    }
  }

  if (!imageBuffer) {
    console.warn('⚠️ Aucune image de preuve réelle trouvée dans le dossier brain. Génération d\'un buffer blanc pour le test.');
    // Créer un buffer d'image blanc minimal (1x1 JPEG)
    imageBuffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      'base64'
    );
    selectedName = 'preuve_test_nikon.jpg';
  }

  // 3. Préparer le FormData pour l\'upload
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, selectedName);
  
  // Utiliser l\'identifiant du mandat comme tag de dossier Nikon
  formData.append('tag', mandate.id);

  console.log(`🚀 Envoi de la requête POST vers l'API avec le tag "${mandate.id}"...`);

  try {
    const res = await fetch('http://localhost:3000/api/v1/nikon/upload', {
      method: 'POST',
      headers: {
        'x-nikon-key': process.env.NIKON_API_KEY || 'nikon_secret_integration_key_2026'
      },
      body: formData
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = (await res.json()) as any;

    if (res.status === 201 && responseData.success) {
      console.log('✅ [TEST RÉUSSI] La photo a été importée et classée !');
      console.log('📝 Réponse de l\'API :', JSON.stringify(responseData, null, 2));

      // 4. Vérification de la création en base de données
      const fileInDb = await prisma.file.findUnique({
        where: { id: responseData.data.fileId }
      });

      if (fileInDb) {
        console.log('📊 [VÉRIFICATION BDD SUCCÈS] :');
        console.log(` - ID en BDD : ${fileInDb.id}`);
        console.log(` - Nom de fichier : ${fileInDb.name}`);
        console.log(` - Source (userId) : ${fileInDb.userId ? 'Manuel (' + fileInDb.userId + ')' : 'NIKON_CLOUD (null)'}`);
        console.log(` - Coordonnées GPS : Latitude ${fileInDb.geoLat}, Longitude ${fileInDb.geoLng}`);
        console.log(` - Métadonnées EXIF :`, JSON.stringify(fileInDb.exifData));
      } else {
        console.error('❌ [ERREUR VÉRIFICATION] Fichier introuvable en base de données malgré un retour API positif.');
      }
    } else {
      console.error(`❌ [TEST ÉCHOUÉ] Code HTTP : ${res.status}`);
      console.error('📝 Réponse d\'erreur de l\'API :', JSON.stringify(responseData, null, 2));
    }
  } catch (err) {
    console.error('❌ [TEST ÉCHOUÉ] Impossible de contacter le serveur API local :', err);
    console.log('💡 Veuillez vous assurer que le serveur backend est bien démarré sur http://localhost:3000');
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
