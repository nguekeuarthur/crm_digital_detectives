import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const files = await p.file.findMany({
    where: { geoLat: { not: null }, deletedAt: null },
    select: { id: true, name: true, key: true, size: true, mimeType: true, folderId: true }
  });
  console.log('Fichiers géolocalisés:', JSON.stringify(files, null, 2));
  console.log('Total:', files.length);
}

main().catch(console.error).finally(() => p.$disconnect());
