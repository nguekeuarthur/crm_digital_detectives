import { extractMp4Gps, extractMp4CreationDate } from './src/modules/file/file.service';

function runTests() {
  console.log('🧪 [TEST EXIF] Démarrage des tests d\'extraction MP4...');

  // 1. Simuler un buffer MP4 avec les atomes mvhd et ©xyz
  // mvhd : version 0, date de création = 3862713600 (2026-05-27)
  const mvhdType = Buffer.from([0x6d, 0x76, 0x68, 0x64]); // 'mvhd'
  const mvhdHeader = Buffer.from([0, 0, 0, 0]); // version 0, flags 0
  const creationTime = Buffer.alloc(4);
  creationTime.writeUInt32BE(3862713600, 0); // 2026-05-27T08:00:00Z (approx)

  // ©xyz : avec coordonnées GPS "+46.2044+006.1432/"
  const xyzType = Buffer.from([0xa9, 0x78, 0x79, 0x7a]); // '©xyz'
  const coords = Buffer.from('+46.2044+006.1432/');

  // Création du buffer simulé global
  const buffer = Buffer.concat([
    Buffer.alloc(20), // Padding de début
    mvhdType,
    mvhdHeader,
    creationTime,
    Buffer.alloc(30), // Padding intermédiaire
    xyzType,
    coords,
    Buffer.alloc(10) // Padding de fin
  ]);

  // 2. Exécuter l'extraction de la date
  const extractedDate = extractMp4CreationDate(buffer);
  console.log('📅 Date de création extraite :', extractedDate?.toISOString());
  if (extractedDate && extractedDate.toISOString().startsWith('2026-05-27')) {
    console.log('✅ [DATE TEST] SUCCESS');
  } else {
    console.error('❌ [DATE TEST] FAILED');
  }

  // 3. Exécuter l'extraction GPS
  const extractedGps = extractMp4Gps(buffer);
  console.log('📍 Coordonnées GPS extraites :', extractedGps);
  if (extractedGps && extractedGps.geoLat === 46.2044 && extractedGps.geoLng === 6.1432) {
    console.log('✅ [GPS TEST] SUCCESS');
  } else {
    console.error('❌ [GPS TEST] FAILED');
  }
}

runTests();
