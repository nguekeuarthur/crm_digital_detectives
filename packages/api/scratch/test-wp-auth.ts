import 'dotenv/config';
import axios from 'axios';

async function testWP() {
  const url = `${process.env.WP_URL}/wp-json/wp/v2/users/me`;
  const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

  console.log('🔌 Test connexion WordPress...');
  
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log('✅ Connexion réussie !');
    console.log(`   User: ${res.data.name} (ID: ${res.data.id})`);
    console.log(`   Role: ${JSON.stringify(res.data.roles)}`);
  } catch (err: any) {
    console.log(`❌ Erreur ${err.response?.status}: ${JSON.stringify(err.response?.data)}`);
  }

  // Test aussi la liste des users
  try {
    const res2 = await axios.get('https://digitaldetectives.ch/wp-json/wp/v2/users?context=edit', {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log(`\n📋 Utilisateurs WP (avec emails) : ${res2.data.length}`);
    for (const u of res2.data) {
      console.log(`   - ${u.name} | ${u.email} | Rôles: ${JSON.stringify(u.roles)}`);
    }
  } catch (err: any) {
    console.log(`❌ Liste users erreur ${err.response?.status}: ${err.response?.data?.message}`);
  }

  // Test création d'un user (dry run - on vérifie juste si on a le droit)
  try {
    const res3 = await axios.options('https://digitaldetectives.ch/wp-json/wp/v2/users', {
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log(`\n🔐 Permissions sur /users: ${res3.status}`);
  } catch (err: any) {
    console.log(`❌ Permissions: ${err.response?.status}`);
  }
}

testWP();
