import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuoteFlow() {
  console.log('🧪 Test du flux complet de devis...\n');

  // 1. Récupérer les données de test
  const user = await prisma.user.findFirst();
  const client = await prisma.client.findFirst();
  const mandat = await prisma.mandat.findFirst();
  const services = await prisma.service.findMany({ where: { isActive: true } });

  if (!user || !client || !mandat || services.length === 0) {
    console.error('❌ Données de test manquantes');
    return;
  }

  console.log(`👤 User: ${user.email}`);
  console.log(`🏢 Client: ${client.firstName} ${client.lastName} (${client.email})`);
  console.log(`📁 Mandat: ${mandat.title}`);
  console.log(`📦 Services dispo: ${services.length}\n`);

  // 2. Créer un devis via l'API interne (simulation)
  // On importe directement le service
  const { QuoteService } = await import('../src/modules/quote/quote.service');
  const { PDFService } = await import('../src/modules/quote/pdf.service');

  const quote = await QuoteService.createQuote({
    mandatId: mandat.id,
    clientId: client.id,
    taxRate: 7.7,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
    notes: 'Devis valable 30 jours. Conditions générales de vente applicables. Toute prestation commencée est due.',
    items: [
      {
        serviceId: services[0]?.id,
        label: services[0]?.name || 'Surveillance jour',
        quantity: 8,
        unitPrice: services[0]?.unitPrice || 120,
        discount: 0
      },
      {
        serviceId: services[1]?.id,
        label: services[1]?.name || 'Surveillance nuit',
        quantity: 4,
        unitPrice: services[1]?.unitPrice || 180,
        discount: 10
      },
      {
        label: 'Frais de déplacement forfaitaire',
        quantity: 1,
        unitPrice: 150,
        discount: 0
      }
    ]
  }, user.id);

  console.log(`✅ Devis créé: ${quote.reference}`);
  console.log(`   Total HT: ${quote.totalHT} CHF`);
  console.log(`   Total TTC: ${quote.totalTTC} CHF`);
  console.log(`   Marge: ${quote.marginRate}%`);
  console.log(`   Items: ${quote.items.length}\n`);

  // 3. Générer le PDF
  console.log('📄 Génération du PDF...');
  const startTime = Date.now();
  const pdfPath = await PDFService.generateQuote(quote.id);
  const duration = Date.now() - startTime;

  console.log(`✅ PDF généré en ${duration}ms`);
  console.log(`   Fichier: ${pdfPath}\n`);

  // Vérifier le critère < 5 secondes
  if (duration < 5000) {
    console.log('✅ CRITÈRE ACCEPTÉ: PDF généré en moins de 5 secondes');
  } else {
    console.log('❌ CRITÈRE ÉCHOUÉ: PDF a pris plus de 5 secondes');
  }

  await prisma.$disconnect();
}

testQuoteFlow().catch(console.error);
