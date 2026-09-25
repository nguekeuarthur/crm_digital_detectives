import 'dotenv/config';
import { prisma } from '../src/shared/prisma';
import { ClientService } from '../src/modules/client/client.service';

async function testEndToEndSync() {
  console.log('🔄 Lancement du test end-to-end de création de client...');

  // Générer un email aléatoire pour éviter les doublons
  const randomId = Math.floor(Math.random() * 100000);
  const fakeClientData = {
    email: `jean.dupont_${randomId}@digitaldetectives.test`,
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: `+4179${randomId.toString().padStart(6, '0')}`,
    company: 'Test Sync SA'
  };

  try {
    // On simule qu'un administrateur (avec un faux ID pour le test) crée le client
    const fakeAdminId = 'system-test-id';
    
    console.log('1️⃣ Création du client dans la base de données du CRM...');
    const newClient = await ClientService.createClient(fakeClientData, fakeAdminId);
    
    console.log(`✅ Client créé dans le CRM avec l'ID : ${newClient.id}`);
    console.log('2️⃣ Attente de 3 secondes pour laisser la synchronisation WordPress se terminer en arrière-plan...');
    
    // Attendre un peu pour que la promesse en arrière-plan se termine (et affiche ses logs)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Test terminé ! Le client devrait maintenant apparaître dans la liste des utilisateurs WordPress.');
  } catch (error: any) {
    console.error('❌ Erreur lors du test :', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEndToEndSync();
