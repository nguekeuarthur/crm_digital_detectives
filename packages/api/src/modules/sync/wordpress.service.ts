import { prisma } from '../../shared/prisma';
import axios from 'axios';
import { AuditService } from '../audit/audit.service';

export class WordpressService {
  /**
   * Importation manuelle/globale depuis WordPress via WP Webhooks
   */
  static async syncClients(adminId: string) {
    const url = process.env.WP_WEBHOOK_URL;

    if (!url) {
      throw new Error('WP_WEBHOOK_URL non configuré dans le .env');
    }

    try {
      const params = new URLSearchParams({
        action: 'get_users',
        arguments: JSON.stringify({ number: 1000 })
      });

      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!response.data || !response.data.success) {
        throw new Error('Échec de la récupération des utilisateurs via WP Webhooks');
      }

      // La réponse de WP Webhooks a une structure spéciale pour get_users
      // res.data.data contient un tableau d'objets, où chaque objet a une propriété "data"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      let wpUsers: any[] = [];
      const responseData = response.data.data;
      
      if (Array.isArray(responseData)) {
        wpUsers = responseData;
      }

      let created = 0;
      let updated = 0;

      for (const item of wpUsers) {
        // Les infos de l'utilisateur sont nichées dans la propriété "data"
        const wpUser = item.data;
        if (!wpUser) continue;

        const email = wpUser.user_email || wpUser.email;
        if (!email) continue;

        const wpId = wpUser.ID?.toString() || wpUser.id?.toString();
        const firstName = wpUser.first_name || wpUser.display_name?.split(' ')[0] || 'Inconnu';
        const lastName = wpUser.last_name || wpUser.display_name?.split(' ').slice(1).join(' ') || 'Inconnu';

        const existingClient = await prisma.client.findFirst({
          where: {
            OR: [
              { email },
              { wpId }
            ]
          }
        });

        if (existingClient) {
          await prisma.client.update({
            where: { id: existingClient.id },
            data: {
              firstName: existingClient.firstName === 'Inconnu' ? firstName : undefined,
              lastName: existingClient.lastName === 'Inconnu' ? lastName : undefined,
              wpId
            }
          });
          updated++;
        } else {
          await prisma.client.create({
            data: {
              email,
              firstName,
              lastName,
              wpId,
              status: 'PROSPECT'
            }
          });
          created++;
        }
      }

      await AuditService.log({
        userId: adminId,
        action: 'WP_SYNC_CLIENTS',
        entity: 'Client',
        newValue: { created, updated, total: wpUsers.length }
      });

      return { created, updated, totalFetched: wpUsers.length };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Erreur de synchronisation WP:', error.message);
      throw new Error('Erreur de communication avec WordPress Webhooks');
    }
  }

  /**
   * Webhook: Gère la création en temps réel d'un client (Push depuis WP)
   */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async handleClientWebhook(wpUser: any) {
    if (!wpUser.email) return null;

    const client = await prisma.client.upsert({
      where: { email: wpUser.email },
      update: {
        wpId: wpUser.id?.toString(),
        firstName: wpUser.first_name || wpUser.name,
        lastName: wpUser.last_name || ''
      },
      create: {
        email: wpUser.email,
        firstName: wpUser.first_name || wpUser.name || 'Inconnu',
        lastName: wpUser.last_name || 'Inconnu',
        wpId: wpUser.id?.toString(),
        status: 'PROSPECT'
      }
    });

    return client;
  }

  /**
   * Webhook: Gère la création d'un mandat (Formulaire WP CF7/WooCommerce)
   */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async handleMandateWebhook(formData: any) {
    // Le webhook WP doit envoyer l'email du client
    if (!formData.email || !formData.title) {
      throw new Error('Payload invalide: email et title requis');
    }

    // 1. Trouver ou créer le client
    const client = await prisma.client.upsert({
      where: { email: formData.email },
      update: {},
      create: {
        email: formData.email,
        firstName: formData.firstName || 'Prospect',
        lastName: formData.lastName || 'Web',
        status: 'PROSPECT'
      }
    });

    // 2. Créer le mandat
    const mandat = await prisma.mandat.create({
      data: {
        title: formData.title,
        description: formData.description,
        clientId: client.id,
        status: 'OUVERT'
      }
    });

    // 3. Créer l'arborescence (réutilisation logique existante)
    const STANDARD_DOSSIERS = [
      '01_CONTRATS', '02_ECHANGES_CLIENTS', '03_PIECES_TRANSMISES',
      '04_RECHERCHES_INTERNES', 'Preuves Photographiques', '06_RAPPORTS', '07_NOTES_IA'
    ];
    
    await prisma.dossier.createMany({
      data: STANDARD_DOSSIERS.map(name => ({
        name,
        mandatId: mandat.id,
        isSystem: true
      }))
    });

    return mandat;
  }
}
