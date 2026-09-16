import 'dotenv/config';
import axios from 'axios';

async function testJSONCustomer() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `json_customer_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test JSON avec role=customer...\n');

  const payload = {
    action: 'create_user',
    user_login: `json_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'JSON',
    last_name: 'Customer',
    role: 'customer'
  };

  // Envoi en JSON (format par défaut d'axios, comme le premier test qui marchait)
  const res = await axios.post(url, payload);

  console.log(`✅ Succès: ${res.data.success}`);
  console.log(`   Rôle dans la réponse: ${res.data?.data?.user_data?.role}`);
  console.log(`   WP ID: ${res.data?.data?.user_id}`);
  console.log(`\n👉 Vérifie "${email}" dans WordPress !`);
}

testJSONCustomer();
