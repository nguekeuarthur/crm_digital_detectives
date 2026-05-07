import axios from 'axios';
import { Client } from '@prisma/client';

export class WPService {
  /**
   * Synchronise un utilisateur inscrit sur le CRM vers WordPress avec le rôle "customer"
   */
  static async syncRegisteredUserToWP(user: { email: string; firstName: string; lastName: string }) {
    return WPService.pushToWordPress({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      // WP Webhooks ne gère que les rôles natifs WP — le snippet WPCode
      // convertit automatiquement 'subscriber' → 'customer' après création
      role: 'subscriber'
    });
  }

  /**
   * Synchronise un Client (fiche client CRM) vers WordPress avec le rôle "subscriber"
   */
  static async syncUserToWP(client: Client) {
    return WPService.pushToWordPress({
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      role: 'subscriber'
    });
  }

  /**
   * Méthode interne commune — upsert vers WP Webhooks
   * Si l'utilisateur existe déjà, on met à jour son rôle
   * Si non, on le crée
   */
  private static async pushToWordPress(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    const url = process.env.WP_WEBHOOK_URL;
    if (!url) {
      console.warn('⚠️ [WP Sync] WP_WEBHOOK_URL non configuré, synchronisation ignorée.');
      return false;
    }

    try {
      console.log(`🔌 [WP Sync] Upsert de ${data.email} sur WordPress (rôle: ${data.role})...`);

      const tempPassword = WPService.generateSecurePassword();
      const userLogin = data.email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);

      const payload = {
        action: 'create_user',
        user_login: userLogin,
        user_email: data.email,
        user_pass: tempPassword,
        first_name: data.firstName,
        last_name: data.lastName,
        // On ne spécifie VOLONTAIREMENT PAS de rôle. 
        // WordPress utilisera son rôle par défaut ("Customer") défini dans ses réglages.
      };

      // JSON (format qui fonctionne avec WP Webhooks)
      const res = await axios.post(url, payload);

      if (res.status === 200 && res.data.success) {
        console.log(`✅ [WP Sync] Créé sur WP (ID: ${res.data.data.user_id}, Rôle: ${data.role})`);
        return true;
      }

      // Si l'email existe déjà, on tente une mise à jour du rôle
      const errors = res.data?.data?.user_id?.errors;
      const isEmailExists = JSON.stringify(errors || '').includes('existing_user_email');

      if (isEmailExists) {
        console.log(`♻️ [WP Sync] Email déjà existant — mise à jour du rôle en "${data.role}"...`);
        const updatePayload = {
          user_email: data.email,
          role: data.role,
          user_role: data.role,
          first_name: data.firstName,
          last_name: data.lastName
        };
        const updateRes = await axios.post(url, updatePayload);
        if (updateRes.status === 200 && updateRes.data.success) {
          console.log(`✅ [WP Sync] Rôle mis à jour avec succès.`);
          return true;
        } else {
          console.error(`❌ [WP Sync] Échec de la mise à jour :`, updateRes.data);
          return false;
        }
      }

      console.error(`❌ [WP Sync] Échec :`, res.data);
      return false;

    } catch (error: any) {
      console.error(`❌ [WP Sync] Erreur :`, error.response?.data || error.message);
      return false;
    }
  }

  private static generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
