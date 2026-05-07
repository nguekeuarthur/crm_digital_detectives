import 'dotenv/config';
import axios from 'axios';

async function testFinal() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `final_${Date.now()}@digitaldetectives.test`;

  console.log('🏁 TEST FINAL — JSON + subscriber + snippet WPCode...\n');

  const payload = {
    action: 'create_user',
    user_login: `final_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'Test',
    last_name: 'Final',
    role: 'subscriber'
  };

  const res = await axios.post(url, payload);
  console.log(`✅ Créé ! WP ID: ${res.data?.data?.user_id}`);
  console.log(`👉 Vérifie "${email}" dans WordPress → doit être "Customer" !`);
}

testFinal();
