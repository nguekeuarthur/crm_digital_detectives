import 'dotenv/config';
import axios from 'axios';

async function testTwoStep() {
  const url = process.env.WP_WEBHOOK_URL!;
  const email = `twostep_${Date.now()}@digitaldetectives.test`;

  console.log('🔍 Test en 2 étapes : Créer + Mettre à jour le rôle...\n');

  // ÉTAPE 1 : Créer l'utilisateur
  console.log('📌 Étape 1 — Création...');
  const createParams = new URLSearchParams({
    action: 'create_user',
    user_login: `two_${Date.now()}`,
    user_email: email,
    user_pass: 'TestPass123!',
    first_name: 'Deux',
    last_name: 'Etapes',
  });

  const createRes = await axios.post(url, createParams.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const userId = createRes.data?.data?.user_id;
  console.log(`   ✅ Utilisateur créé (WP ID: ${userId})`);

  if (!userId) {
    console.error('   ❌ Pas de user_id, impossible de continuer.');
    return;
  }

  // ÉTAPE 2 : Mettre à jour le rôle
  console.log('📌 Étape 2 — Mise à jour du rôle en "customer"...');
  const updateParams = new URLSearchParams({
    action: 'update_user',
    user_id: String(userId),
    role: 'customer',
  });

  try {
    const updateRes = await axios.post(url, updateParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`   ✅ Réponse update:`, JSON.stringify(updateRes.data, null, 2));
    console.log(`\n👉 Vérifie "${email}" dans WordPress — il devrait être "Customer" !`);
  } catch (err: any) {
    console.error(`   ❌ Erreur update:`, err.response?.data || err.message);
  }
}

testTwoStep();
