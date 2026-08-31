import { PrismaClient, ServiceUnit, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seed du catalogue des prestations...');

  const services = [
    {
      name: 'Heure de surveillance (Jour)',
      description: 'Filature et surveillance en journée (08:00 - 20:00)',
      unitPrice: 120,
      internalCost: 45,
      unit: ServiceUnit.HOUR,
      category: ServiceCategory.SURVEILLANCE
    },
    {
      name: 'Heure de surveillance (Nuit/Dimanche)',
      description: 'Filature et surveillance en période majorée',
      unitPrice: 180,
      internalCost: 75,
      unit: ServiceUnit.HOUR,
      category: ServiceCategory.SURVEILLANCE
    },
    {
      name: 'Frais kilométriques',
      description: 'Déplacements opérationnels (véhicule banalisé)',
      unitPrice: 1.20,
      internalCost: 0.60,
      unit: ServiceUnit.KM,
      category: ServiceCategory.LOGISTICS
    },
    {
      name: 'Rapport d\'enquête final',
      description: 'Rédaction et mise en page du rapport avec preuves',
      unitPrice: 250,
      internalCost: 0,
      unit: ServiceUnit.FIXED,
      category: ServiceCategory.REPORT
    },
    {
      name: 'Forfait recherche administrative',
      description: 'Recherche de domicile ou d\'employeur',
      unitPrice: 450,
      internalCost: 150,
      unit: ServiceUnit.FIXED,
      category: ServiceCategory.DIGITAL_INVESTIGATION
    }
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { id: 'dummy' }, // This will always fall to create because dummy is not a valid uuid and won't match
      update: {},
      create: s
    }).catch(async (e) => {
        // Since upsert with dummy id might fail on where check if not valid UUID
        await prisma.service.create({ data: s });
    });
  }

  console.log('✅ Catalogue initialisé !');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
