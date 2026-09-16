import 'dotenv/config';
import axios from 'axios';

async function testWPNativeHook() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `final_test_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test final avec hook natif WP (user_register)...');

  const params = new URLSearchParams({
    action: 'create_user',
    user_login: `final_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'Test',
    last_name: 'Natif',
    role: 'subscriber' // On envoie subscriber exprès pour voir si le snippet force 'customer' !
  });

  try {
    await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`✅ Requête envoyée avec succès !`);
    console.log(`👉 Vérifie l'utilisateur "${email}" dans WordPress, il DOIT être "Customer" grâce au snippet.`);
  } catch (err: any) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
}

testWPNativeHook();
