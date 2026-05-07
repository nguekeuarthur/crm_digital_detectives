import { prisma } from '../../shared/prisma';
import axios from 'axios';
import { AuditService } from '../audit/audit.service';

export class WordpressService {
  /**
   * Importation manuelle/globale depuis l'API REST de WordPress
   */
  static async syncClients(adminId: string) {
    const { WP_URL, WP_USERNAME, WP_APP_PASSWORD } = process.env;

    if (!WP_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
      throw new Error('La configuration WordPress est incomplète dans le .env');
    }

    try {
      // Appel à l'API WordPress (Endpoints natifs)
      const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
      const response = await axios.get(`${WP_URL}/wp-json/wp/v2/users`, {
        headers: { Authorization: `Basic ${auth}` },
        params: { context: 'edit', per_page: 100 }
      });

      const wpUsers = response.data;
      let created = 0;
      let updated = 0;

      for (const wpUser of wpUsers) {
        // Logique de conflit : email existant ou wpId existant
        const existingClient = await prisma.client.findFirst({
          where: {
            OR: [
              { email: wpUser.email },
              { wpId: wpUser.id.toString() }
            ]
          }
        });

        if (existingClient) {
          // Mise à jour
          await prisma.client.update({
            where: { id: existingClient.id },
            data: {
              firstName: wpUser.first_name || existingClient.firstName,
              lastName: wpUser.last_name || existingClient.lastName,
              wpId: wpUser.id.toString()
            }
          });
          updated++;
        } else {
          // Création
          await prisma.client.create({
            data: {
              email: wpUser.email,
              firstName: wpUser.first_name || 'Inconnu',
              lastName: wpUser.last_name || 'Inconnu',
              wpId: wpUser.id.toString(),
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
    } catch (error: any) {
      console.error('Erreur de synchronisation WP:', error.message);
      throw new Error('Erreur de communication avec WordPress');
    }
  }

  /**
   * Webhook: Gère la création en temps réel d'un client (Push depuis WP)
   */
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
