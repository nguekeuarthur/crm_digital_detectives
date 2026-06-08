import 'dotenv/config';
import axios from 'axios';

async function testWPWebhook() {
  const url = process.env.WP_WEBHOOK_URL;
  if (!url) {
    console.error('WP_WEBHOOK_URL is missing');
    return;
  }

  console.log('🔌 Test de synchronisation via WP Webhooks...');

  // WP Webhooks attend généralement action et data
  const payload = {
    action: 'create_user',
    user_login: 'client_sync_test_' + Date.now(),
    user_email: `test_${Date.now()}@digitaldetectives.ch`,
    user_pass: 'TestPassWord123!?',
    first_name: 'Test',
    last_name: 'Sync',
    role: 'subscriber' // Rôle par défaut
  };

  try {
    const res = await axios.post(url, payload);
    console.log(`✅ Webhook répondu avec statut: ${res.status}`);
    console.log('   Réponse:', JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.log(`❌ Erreur Webhook: ${error.response?.status}`);
    console.log('   Détails:', error.response?.data || error.message);
  }
}

testWPWebhook();
