import 'dotenv/config';
import axios from 'axios';

async function testAdditionalRoles() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `add_role_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test final pour forcer CUSTOMER avec additional_roles...\n');

  const payload = {
    action: 'create_user',
    user_login: `add_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'Super',
    last_name: 'Customer',
    role: 'subscriber', 
    additional_roles: ['customer'] // On essaie via array
  };

  try {
    const res = await axios.post(url, payload);
    console.log(`✅ TEST ARRAY - Succès: ${res.data.success}`);
    console.log(`👉 Va vérifier l'utilisateur "${email}" dans WordPress.`);
  } catch (err: any) {
    console.error('❌ Erreur ARRAY:', err.response?.data || err.message);
  }

  // Test 2: en string
  const email2 = `add_role2_${Date.now()}@digitaldetectives.test`;
  const payload2 = {
    action: 'create_user',
    user_login: `add2_${Date.now()}`,
    user_email: email2,
    user_pass: 'TestPass123!',
    first_name: 'Super',
    last_name: 'Customer',
    role: 'subscriber', 
    additional_roles: 'customer' // On essaie via string
  };

  try {
    const res2 = await axios.post(url, payload2);
    console.log(`✅ TEST STRING - Succès: ${res2.data.success}`);
    console.log(`👉 Va vérifier l'utilisateur "${email2}" dans WordPress.`);
  } catch (err: any) {
    console.error('❌ Erreur STRING:', err.response?.data || err.message);
  }
}

testAdditionalRoles();
