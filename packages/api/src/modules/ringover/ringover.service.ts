import { prisma } from '../../shared/prisma';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export class RingoverService {
  /**
   * Recherche un client correspondant au numéro de téléphone entrant
   */
  static async lookupClient(phone: string) {
    if (!phone) return null;

    const clients = await prisma.client.findMany({
      where: { phone: { not: null }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, phone: true, company: true, email: true }
    });

    const matchedClient = clients.find((c) => WhatsappService.matchPhone(c.phone!, phone));
    return matchedClient || null;
  }

  /**
   * Résout le mandat sur lequel logguer l'appel.
   * Priorité au dernier mandat actif. En second recours, le dernier mandat fermé.
   */
  static async findMandateForCallLogging(clientId: string) {
    // 1. Chercher un mandat actif
    const activeMandate = await prisma.mandat.findFirst({
      where: {
        clientId,
        status: {
          notIn: ['TERMINE', 'ANNULE']
        },
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeMandate) return activeMandate;

    // 2. Chercher le dernier mandat historique si pas d'actif
    const lastMandate = await prisma.mandat.findFirst({
      where: {
        clientId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    return lastMandate || null;
  }
}
