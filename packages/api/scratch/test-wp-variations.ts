import 'dotenv/config';
import axios from 'axios';

async function testWPVariations() {
  const url = `${process.env.WP_URL}/wp-json/wp/v2/users/me`;
  const password = "N7qo p0Lu NgZT c6ty";
  const passwordNoSpaces = password.replace(/\s/g, '');
  
  const variations = [
    { u: "ArthurGIT", p: password, desc: "Username + Password avec espaces" },
    { u: "ArthurGIT", p: passwordNoSpaces, desc: "Username + Password SANS espaces" },
    { u: "arthur.nguekeu2000@gmail.com", p: password, desc: "Email + Password avec espaces" },
    { u: "arthur.nguekeu2000@gmail.com", p: passwordNoSpaces, desc: "Email + Password SANS espaces" }
  ];

  console.log('🔌 Test des variations de connexion WordPress...\n');

  for (const v of variations) {
    const auth = Buffer.from(`${v.u}:${v.p}`).toString('base64');
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` }
      });
      console.log(`✅ SUCCÈS [${v.desc}] !`);
      console.log(`   User: ${res.data.name} (ID: ${res.data.id})\n`);
      return; // On s'arrête si ça marche
    } catch (err: any) {
      console.log(`❌ ÉCHEC [${v.desc}] - Erreur ${err.response?.status}`);
    }
  }
}

testWPVariations();
