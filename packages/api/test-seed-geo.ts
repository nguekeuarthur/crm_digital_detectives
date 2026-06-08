import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 [SEED GEO] Recherche d\'un mandat pour injecter une preuve géolocalisée...');
  
  // Trouver le premier mandat disponible
  const mandate = await prisma.mandat.findFirst({
    include: { dossiers: true }
  });

  if (!mandate) {
    console.error('❌ Aucun mandat trouvé en base de données.');
    console.log('💡 Veuillez d\'abord simuler un appel ou créer un client avec un mandat dans l\'UI.');
    return;
  }

  // Trouver un dossier (de préférence contenant "Preuves" ou le premier)
  let folder = mandate.dossiers.find(f => f.name.toLowerCase().includes('preuve'));
  if (!folder) {
    folder = mandate.dossiers[0];
  }

  if (!folder) {
    console.error(`❌ Le mandat "${mandate.title}" ne possède aucun dossier.`);
    return;
  }

  // Nettoyer les anciens fichiers de test similaires pour éviter les doublons
  await prisma.file.deleteMany({
    where: {
      name: 'preuve_simulation_geneve.jpg',
      folderId: folder.id
    }
  });

  // Créer l'enregistrement de fichier géolocalisé à Genève
  const file = await prisma.file.create({
    data: {
      name: 'preuve_simulation_geneve.jpg',
      key: `mandats/${mandate.id}/${folder.id}/preuve_simulation_geneve.jpg`,
      size: 2048,
      mimeType: 'image/jpeg',
      folderId: folder.id,
      geoLat: 46.2044, // Latitude Genève
      geoLng: 6.1432,  // Longitude Genève
      exifData: {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        DateTimeOriginal: new Date().toISOString()
      }
    }
  });

  console.log(`✅ Simulation réussie !`);
  console.log(` Mandat cible : "${mandate.title}"`);
  console.log(` Dossier cible : "${folder.name}"`);
  console.log(` Preuve injectée : "${file.name}"`);
  console.log(` Coordonnées GPS : Latitude ${file.geoLat}, Longitude ${file.geoLng} (Genève)`);
  console.log(`\n💡 Vous pouvez maintenant ouvrir la fiche client dans l'UI, cliquer sur "Carte" à côté de ce mandat pour voir le pin.`);
}

seed()
  .catch(err => console.error('❌ Erreur lors du seed :', err))
  .finally(() => prisma.$disconnect());
