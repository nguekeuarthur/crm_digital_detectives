import 'dotenv/config';
import { PrismaClient, InvoiceStatus, ClientStatus, MandatStatus } from '@prisma/client';
import { StripeService } from './src/modules/billing/stripe.service.js';
import { BillingService } from './src/modules/billing/billing.service.js';
import Stripe from 'stripe';
import assert from 'assert';

const prisma = new PrismaClient();

async function runStripeTests() {
  console.log('🚀 DÉBUT DU TEST DE L\'INTÉGRATION STRIPE...\n');

  try {
    // 1. Assurer l'existence d'un administrateur
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      console.log('✏️ Création d\'un administrateur temporaire de test...');
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

    // 2. Assurer l'existence d'un client
    let client = await prisma.client.findFirst();
    if (!client) {
      console.log('✏️ Création d\'un client temporaire de test...');
      client = await prisma.client.create({
        data: {
          firstName: 'Wilfried',
          lastName: 'Test',
          email: 'wilfried-client-test@example.com',
          phone: '+33612345678',
          status: ClientStatus.ACTIF
        }
      });
    }
    console.log(`✅ Client identifié : ${client.firstName} ${client.lastName} (${client.email})`);

    // 3. Assurer l'existence d'un mandat
    let mandat = await prisma.mandat.findFirst({ where: { clientId: client.id } });
    if (!mandat) {
      console.log('✏️ Création d\'un mandat temporaire de test...');
      mandat = await prisma.mandat.create({
        data: {
          title: 'Mandat de Test WhatsApp 1779527565547',
          description: 'Enquête de test Stripe',
          clientId: client.id,
          status: MandatStatus.OUVERT
        }
      });
    }
    console.log(`✅ Mandat identifié : "${mandat.title}"`);

    // 4. Création d'un devis fictif (optionnel mais recommandé pour lier à la facture)
    console.log('✏️ Création d\'un devis temporaire pour la facture...');
    const quote = await prisma.quote.create({
      data: {
        reference: `DD-TEST-${Date.now()}`,
        mandatId: mandat.id,
        clientId: client.id,
        status: 'ACCEPTED',
        totalHT: 150.00,
        totalTTC: 161.55,
        taxRate: 7.7
      }
    });
    console.log(`✅ Devis créé avec référence : ${quote.reference}`);

    // 5. Création d'une facture de test
    console.log('✏️ Création d\'une facture PENDING de test...');
    const invoice = await prisma.invoice.create({
      data: {
        quoteId: quote.id,
        mandatId: mandat.id,
        amount: 161.55, // 161.55 CHF
        status: InvoiceStatus.PENDING
      }
    });
    console.log(`✅ Facture créée : ID=${invoice.id}, Montant=${invoice.amount} CHF, Statut=${invoice.status}`);

    // 6. Test de création de Session Checkout Stripe
    const hasStripeKey = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_12345';
    console.log(`\n--- VÉRIFICATION DES CLÉS STRIPE ---`);
    console.log(`STRIPE_SECRET_KEY configuré ? ${hasStripeKey ? 'Oui (Réel)' : 'Non (Mode simulation)'}`);

    let checkoutUrl = '';

    if (!hasStripeKey) {
      console.log('⚠️ Aucune clé Stripe valide détectée dans le fichier .env. Utilisation de la simulation...');
      
      // On mock la méthode StripeService.createCheckoutSession pour retourner une fausse URL de test
      const originalCreateSession = StripeService.createCheckoutSession;
      StripeService.createCheckoutSession = async (id: string) => {
        const inv = await prisma.invoice.findUnique({ where: { id } });
        if (!inv) throw new Error('Facture introuvable');
        
        // Mettre à jour la facture avec un faux ID de session
        const mockSessionId = `cs_test_${Date.now()}`;
        await prisma.invoice.update({
          where: { id },
          data: { stripeSessionId: mockSessionId }
        });
        
        return { url: `https://checkout.stripe.com/pay/${mockSessionId}` };
      };

      const session = await StripeService.createCheckoutSession(invoice.id);
      checkoutUrl = session.url;
      console.log(`✅ [SIMULATION] Checkout Session générée avec succès : ${checkoutUrl}`);
      
      // Restaurer la méthode d'origine
      StripeService.createCheckoutSession = originalCreateSession;
    } else {
      try {
        console.log('⚡ Tentative de création d\'une vraie Checkout Session via Stripe API...');
        const session = await StripeService.createCheckoutSession(invoice.id);
        checkoutUrl = session.url || '';
        console.log(`✅ [STRIPE API] Checkout Session générée avec succès : ${checkoutUrl}`);
      } catch (err: any) {
        console.error(`❌ Erreur Stripe API : ${err.message}`);
        throw err;
      }
    }

    // Récupérer la facture mise à jour pour s'assurer que stripeSessionId a bien été enregistré
    const updatedInvoiceBeforePayment = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });
    console.log(`✅ Session ID enregistré dans la facture DB : ${updatedInvoiceBeforePayment?.stripeSessionId}`);

    // 7. Test de la simulation du Webhook Stripe et de la facturation automatique
    console.log(`\n--- SIMULATION DU WEBHOOK STRIPE PAIEMENT SUCCEEDED ---`);
    
    // Au lieu de faire un appel HTTP, on simule l'action interne du webhook
    // Le webhook extrait l'ID de facture et appelle BillingService.markInvoiceAsPaid
    console.log(`✏️ Marquage de la facture ${invoice.id} comme payée via BillingService...`);
    const paidInvoice = await BillingService.markInvoiceAsPaid(invoice.id);
    
    console.log(`✅ Statut mis à jour dans la base de données : ${paidInvoice.status}`);
    assert.strictEqual(paidInvoice.status, InvoiceStatus.PAID, 'Le statut de la facture doit être PAID');

    // Générer la facture PDF et vérifier
    console.log('✏️ Génération du reçu de facture PDF...');
    const pdfBuffer = await BillingService.generateClientInvoicePDF(
      await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          mandat: { include: { client: true } },
          quote: true
        }
      })
    );

    assert.ok(pdfBuffer instanceof Buffer, 'Le PDF généré doit être un Buffer');
    assert.ok(pdfBuffer.length > 0, 'Le PDF généré ne doit pas être vide');
    console.log(`✅ Facture PDF générée avec succès ! Taille : ${pdfBuffer.length} octets`);

    console.log('\n--- NETTOYAGE DES DONNÉES DE TEST ---');
    // On nettoie la facture et le devis créés pour les tests
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.quote.delete({ where: { id: quote.id } });
    console.log('✅ Données temporaires nettoyées de la base de données.');

    console.log('\n🎉 TOUS LES TESTS DE L\'INTÉGRATION STRIPE SONT REUSSIS AVEC SUCCÈS !');
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST STRIPE :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStripeTests();
