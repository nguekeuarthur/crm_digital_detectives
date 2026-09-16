import 'dotenv/config';
import axios from 'axios';

async function testWPHook() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `test_hook_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test de création WP Webhooks + Hook Custom (do_action)...\n');

  const params = new URLSearchParams({
    action: 'create_user',
    user_login: `hook_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'Super',
    last_name: 'Hook',
    role: 'customer',
    do_action: 'crm_set_role_customer' // <-- C'est ça qui va déclencher ton snippet PHP !
  });

  try {
    const res = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log(`✅ Succès: ${res.data.success}`);
    console.log(`👉 Va vérifier l'utilisateur "${email}" dans WordPress.`);
    console.log(`   Il devrait avoir le rôle "Customer" !`);
  } catch (err: any) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
}

testWPHook();
