import 'dotenv/config';
import axios from 'axios';

async function testNoRole() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `norole_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test sans spécifier le rôle (pour forcer WP à utiliser son rôle par défaut)...\n');

  const payload = {
    action: 'create_user',
    user_login: `norole_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'No',
    last_name: 'RoleSpecifie'
    // Je NE METS PAS le champ "role". 
    // WordPress devrait utiliser "Customer" comme défini dans ses réglages généraux.
  };

  try {
    const res = await axios.post(url, payload);
    console.log(`✅ Succès: ${res.data.success}`);
    console.log(`   WP ID: ${res.data?.data?.user_id}`);
    console.log(`👉 Va vérifier l'utilisateur "${email}" dans WordPress !`);
  } catch (err: any) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
}

testNoRole();
