import 'dotenv/config';
import { PrismaClient, InvoiceStatus, ClientStatus, MandatStatus } from '@prisma/client';
import { BillingService } from './src/modules/billing/billing.service.js';

const prisma = new PrismaClient();

async function runEmailSimulation() {
  console.log('🚀 DÉBUT DE LA SIMULATION DE PAIEMENT POUR edimaevina@icloud.com...\n');

  try {
    // 1. Assurer l'existence d'un administrateur
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      console.log('✏️ Création d\'un administrateur temporaire...');
      admin = await prisma.user.create({
        data: {
          email: 'admin-test@digitaldetectives.ch',
          password: 'hashedpassword123',
          firstName: 'Jean',
          lastName: 'Admin',
          role: 'ADMIN'
        }
      });
    }
    console.log(`✅ Administrateur identifié : ${admin.firstName} ${admin.lastName} (${admin.email})`);

    // 2. Assurer l'existence du client avec l'email spécifié
    const targetEmail = 'edimaevina@icloud.com';
    let client = await prisma.client.findUnique({
      where: { email: targetEmail }
    });

    if (!client) {
      console.log(`✏️ Le client ${targetEmail} n'existe pas. Création du client...`);
      client = await prisma.client.create({
        data: {
          firstName: 'Wilfried',
          lastName: 'Edima Evina',
          email: targetEmail,
          phone: '+41791234567',
          status: ClientStatus.ACTIF
        }
      });
    } else {
      console.log(`✅ Client existant identifié : ${client.firstName} ${client.lastName} (${client.email})`);
    }

    // 3. Assurer l'existence d'un mandat pour ce client
    let mandat = await prisma.mandat.findFirst({
      where: { clientId: client.id, title: 'Simulation Enquête Détective' }
    });
    if (!mandat) {
      console.log('✏️ Création d\'un mandat de simulation...');
      mandat = await prisma.mandat.create({
        data: {
          title: 'Simulation Enquête Détective',
          description: 'Mandat de simulation pour tester le flux de paiement Stripe par e-mail',
          clientId: client.id,
          status: MandatStatus.OUVERT
        }
      });
    }
    console.log(`✅ Mandat identifié : "${mandat.title}"`);

    // 4. Création d'un devis accepté
    console.log('✏️ Création d\'un devis accepté de simulation...');
    const quote = await prisma.quote.create({
      data: {
        reference: `DD-SIM-${Date.now().toString().substring(6)}`,
        mandatId: mandat.id,
        clientId: client.id,
        status: 'ACCEPTED',
        totalHT: 250.00,
        totalTTC: 269.25,
        taxRate: 7.7
      }
    });
    console.log(`✅ Devis créé avec référence : ${quote.reference}`);

    // 5. Création d'une facture PENDING
    console.log('✏️ Création de la facture PENDING...');
    const invoice = await prisma.invoice.create({
      data: {
        quoteId: quote.id,
        mandatId: mandat.id,
        amount: 269.25,
        status: InvoiceStatus.PENDING
      }
    });
    console.log(`✅ Facture créée : ID=${invoice.id}, Montant=${invoice.amount} CHF, Statut=${invoice.status}`);

    // 6. Étape 1 : Génération du lien de paiement et envoi au client
    console.log('\n--- ÉTAPE 1 : ENVOI DU LIEN DE PAIEMENT PAR EMAIL ---');
    console.log(`✉️ Envoi de l'email de facture avec lien de paiement à ${targetEmail}...`);
    const result = await BillingService.sendPaymentLinkToClient(invoice.id);
    console.log(`✅ Lien généré : ${result.url}`);
    console.log(`✅ E-mail envoyé avec succès !`);

    // Attendre 2 secondes pour simuler le délai
    console.log('\n⏳ Pause de 2 secondes avant la confirmation du paiement...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Étape 2 : Simulation de la confirmation de paiement par le webhook Stripe
    console.log('\n--- ÉTAPE 2 : WEBHOOK DE CONFIRMATION DE PAIEMENT ---');
    console.log(`⚙️ Simulation de la réception du webhook Stripe pour la facture ${invoice.id}...`);
    const paidInvoice = await BillingService.markInvoiceAsPaid(invoice.id);
    console.log(`✅ Statut de la facture mis à jour : ${paidInvoice.status}`);
    console.log(`✅ Reçu PDF généré et e-mail envoyé à ${targetEmail} !`);

    console.log('\n🎉 SIMULATION DE BOUT EN BOUT TERMINÉE AVEC SUCCÈS !');
    console.log(`\n📧 Les emails suivants ont été envoyés à ${targetEmail} :`);
    console.log(`  1. Facture avec bouton de paiement (Montant : 269.25 CHF)`);
    console.log(`  2. Confirmation de paiement avec reçu PDF joint`);
    console.log(`\nNote : Les enregistrements de cette simulation ont été conservés dans la base de données afin que vous puissiez les consulter dans votre CRM.`);
  } catch (error) {
    console.error('\n❌ ERREUR LORS DE LA SIMULATION :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEmailSimulation();
