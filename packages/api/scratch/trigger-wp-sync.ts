import { WordpressService } from '../src/modules/sync/wordpress.service';
import * as dotenv from 'dotenv';

// Load env vars from current directory
dotenv.config();

async function runSync() {
  console.log('🚀 Démarrage de la synchronisation WordPress...');
  // Check if env vars are loaded
  if (!process.env.WP_URL) {
      console.error('❌ Erreur: WP_URL non défini. Vérifiez le fichier .env');
      return;
  }
  
  const adminId = '4c5c93b2-7654-4a96-a7f6-7043855634d8';
  
  try {
    const result = await WordpressService.syncClients(adminId);
    console.log('✅ Synchronisation terminée avec succès !');
    console.log('Résultats :', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('❌ Erreur lors de la synchronisation :', error.message);
  }
}

runSync();
