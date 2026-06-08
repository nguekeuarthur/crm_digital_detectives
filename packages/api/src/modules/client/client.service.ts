import { prisma } from '../../shared/prisma';
import { AuditService } from '../audit/audit.service';
import { ClientStatus, Prisma } from '@prisma/client';
import { ValidationError } from '../../shared/errors';
import { z } from 'zod';
import { WPService } from '../wp/wp.service';

export const ClientSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(2, 'Prénom trop court'),
  lastName: z.string().min(2, 'Nom trop court'),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export class ClientService {
  static async createClient(data: z.infer<typeof ClientSchema>, userId: string) {
    // 1. Validation Zod
    const validatedData = ClientSchema.parse(data);

    // 2. Vérification doublon email
    const existingEmail = await prisma.client.findUnique({
      where: { email: validatedData.email }
    });
    if (existingEmail) {
      throw new ValidationError('Un client avec cet email existe déjà');
    }

    // 3. Vérification doublon téléphone (si fourni)
    if (validatedData.phone) {
      const existingPhone = await prisma.client.findFirst({
        where: { phone: validatedData.phone }
      });
      if (existingPhone) {
        throw new ValidationError('Un client avec ce numéro de téléphone existe déjà');
      }
    }

    // 4. Création
    const client = await prisma.client.create({
      data: validatedData
    });

    // 5. Audit Log
    await AuditService.log({
      userId,
      action: 'CREATE',
      entity: 'Client',
      entityId: client.id,
      newValue: client
    });

    // 6. Synchronisation WordPress (en arrière-plan)
    WPService.syncUserToWP(client).catch(err => {
      console.error('Erreur non attrapée lors de la synchro WP', err);
    });

    return client;
  }

  static async getClients(filters: { 
    search?: string; 
    status?: ClientStatus; 
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number 
  }) {
    const { search, status, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = { deletedAt: null };
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
      }),
      prisma.client.count({ where })
    ]);

    return { 
      data: clients, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit) 
    };
  }

  static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { mandats: true }
    });

    if (!client || client.deletedAt) {
      throw new Error('Client non trouvé');
    }

    return client;
  }

  static async updateClient(id: string, data: Partial<z.infer<typeof ClientSchema>>, userId: string) {
    const current = await this.getClientById(id);

    const updated = await prisma.client.update({
      where: { id },
      data
    });

    await AuditService.log({
      userId,
      action: 'UPDATE',
      entity: 'Client',
      entityId: id,
      oldValue: current,
      newValue: updated
    });

    return updated;
  }

  static async deleteClient(id: string, userId: string) {
    const client = await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await AuditService.log({
      userId,
      action: 'DELETE',
      entity: 'Client',
      entityId: id
    });

    return client;
  }

  static async getClientMandates(id: string) {
    return prisma.mandat.findMany({
      where: { clientId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getClientActivity(id: string) {
    const mandates = await prisma.mandat.findMany({
      where: { clientId: id, deletedAt: null },
      select: { id: true }
    });
    
    if (!mandates.length) return [];

    const mandatIds = mandates.map(m => m.id);

    return prisma.activity.findMany({
      where: { mandatId: { in: mandatIds } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } }
    });
  }

  static async checkDuplicate(data: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }) {
    const duplicates = [];

    if (data.email) {
      const byEmail = await prisma.client.findUnique({ where: { email: data.email } });
      if (byEmail) duplicates.push({ client: byEmail, score: 100, reasons: ['Email identique'] });
    }

    if (data.phone) {
      const byPhone = await prisma.client.findFirst({ where: { phone: data.phone } });
      if (byPhone && !duplicates.some(d => d.client.id === byPhone.id)) {
        duplicates.push({ client: byPhone, score: 90, reasons: ['Téléphone identique'] });
      }
    }

    if (data.firstName && data.lastName) {
      const byName = await prisma.client.findFirst({ 
        where: { 
          firstName: { equals: data.firstName, mode: 'insensitive' },
          lastName: { equals: data.lastName, mode: 'insensitive' }
        } 
      });
      if (byName && !duplicates.some(d => d.client.id === byName.id)) {
        duplicates.push({ client: byName, score: 80, reasons: ['Nom et prénom identiques'] });
      }
    }

    return { duplicates };
  }
}
