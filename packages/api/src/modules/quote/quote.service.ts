import { prisma } from '../../shared/prisma';
import { QuoteStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ValidationError } from '../../shared/errors';

export class QuoteService {
  /**
   * Génère une référence unique pour le devis (DD-YYYY-NNNN)
   */
  private static async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DD-${year}-`;

    const lastQuote = await prisma.quote.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: 'desc' }
    });

    let nextNumber = 1;
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.reference.split('-')[2], 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Crée un devis brouillon
   */
  static async createQuote(data: {
    mandatId: string;
    clientId: string;
    taxRate?: number;
    expiresAt?: string;
    notes?: string;
    items: Array<{
      serviceId?: string;
      label: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
  }, userId: string) {
    // Vérifier que le mandat existe
    const mandat = await prisma.mandat.findUnique({ where: { id: data.mandatId } });
    if (!mandat) throw new ValidationError('Mandat non trouvé');

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new ValidationError('Client non trouvé');

    const reference = await this.generateReference();
    const taxRate = data.taxRate ?? 7.7;

    // Calculer les totaux des items
    const itemsWithTotals = data.items.map(item => {
      const discount = item.discount || 0;
      const totalHT = item.quantity * item.unitPrice * (1 - discount / 100);
      return { ...item, discount, totalHT };
    });

    const totalHT = itemsWithTotals.reduce((sum, item) => sum + item.totalHT, 0);
    const totalTTC = totalHT * (1 + taxRate / 100);

    // Calculer la marge (si serviceId fourni, on peut calculer le coût interne)
    let totalInternalCost = 0;
    for (const item of itemsWithTotals) {
      if (item.serviceId) {
        const service = await prisma.service.findUnique({ where: { id: item.serviceId } });
        if (service) {
          totalInternalCost += service.internalCost * item.quantity;
        }
      }
    }
    const marginRate = totalHT > 0 ? ((totalHT - totalInternalCost) / totalHT) * 100 : null;

    const quote = await prisma.quote.create({
      data: {
        reference,
        mandatId: data.mandatId,
        clientId: data.clientId,
        taxRate,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        marginRate: marginRate ? Math.round(marginRate * 10) / 10 : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        notes: data.notes,
        items: {
          create: itemsWithTotals.map(item => ({
            serviceId: item.serviceId || null,
            label: item.label,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalHT: Math.round(item.totalHT * 100) / 100
          }))
        }
      },
      include: { items: true, client: true, mandat: true }
    });

    await AuditService.log({
      userId,
      action: 'CREATE_QUOTE',
      entity: 'Quote',
      entityId: quote.id,
      newValue: { reference: quote.reference, totalHT: quote.totalHT }
    });

    return quote;
  }

  /**
   * Lister les devis avec filtres
   */
  static async getQuotes(filters?: { mandatId?: string; clientId?: string; status?: QuoteStatus }) {
    return prisma.quote.findMany({
      where: {
        mandatId: filters?.mandatId,
        clientId: filters?.clientId,
        status: filters?.status
      },
      include: { client: true, mandat: { select: { title: true } }, items: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Récupérer un devis par ID
   */
  static async getQuoteById(id: string) {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: { include: { service: true } }, client: true, mandat: true }
    });
    if (!quote) throw new ValidationError('Devis non trouvé');
    return quote;
  }

  /**
   * Met à jour le statut d'un devis
   */
  static async updateStatus(id: string, status: QuoteStatus, userId: string) {
    const quote = await this.getQuoteById(id);

    if (quote.status === status) {
      return quote;
    }

    if (quote.status === 'ACCEPTED' || quote.status === 'REFUSED') {
      throw new ValidationError(`Impossible de modifier un devis ${quote.status}`);
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : quote.sentAt
      }
    });

    // Si le devis est accepté, créer automatiquement la facture associée
    if (status === 'ACCEPTED') {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { quoteId: id }
      });
      
      if (!existingInvoice) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // J+30 par défaut

        await prisma.invoice.create({
          data: {
            quoteId: id,
            mandatId: quote.mandatId,
            amount: quote.totalTTC,
            status: 'PENDING',
            dueDate
          }
        });
      }
    }

    await AuditService.log({
      userId,
      action: 'UPDATE_QUOTE_STATUS',
      entity: 'Quote',
      entityId: id,
      oldValue: { status: quote.status },
      newValue: { status }
    });

    return updated;
  }

  /**
   * Enregistre le chemin du PDF généré
   */
  static async savePdfPath(id: string, pdfPath: string) {
    return prisma.quote.update({
      where: { id },
      data: { pdfPath }
    });
  }
}
