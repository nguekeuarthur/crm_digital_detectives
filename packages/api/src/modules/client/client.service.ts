import { prisma } from '../../shared/prisma';
import { AuditService } from '../audit/audit.service';
import { ClientStatus, MandateStatus, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../shared/errors';
import { z } from 'zod';
import { WPService } from '../wp/wp.service';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-.()]/g, '').replace(/^\+?0*41/, '0');
}

function bigramSimilarity(a: string, b: string): number {
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (A === B) return 1;
  if (A.length < 2 || B.length < 2) return 0;
  const bigramsA = new Map<string, number>();
  for (let i = 0; i < A.length - 1; i++) {
    const bg = A[i] + A[i + 1];
    bigramsA.set(bg, (bigramsA.get(bg) ?? 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < B.length - 1; i++) {
    const bg = B[i] + B[i + 1];
    const n = bigramsA.get(bg) ?? 0;
    if (n > 0) { bigramsA.set(bg, n - 1); hits++; }
  }
  return (2 * hits) / (A.length + B.length - 2);
}

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
    source?: 'WP' | 'CRM';
    hasActiveMandats?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const {
      search, status, startDate, endDate, source, hasActiveMandats,
      sortBy = 'lastName', sortOrder = 'asc',
      page = 1, limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = { deletedAt: null };

    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (source === 'WP') where.wpId = { not: null };
    else if (source === 'CRM') where.wpId = null;

    if (hasActiveMandats) {
      where.mandats = { some: { status: MandateStatus.ACTIVE, deletedAt: null } };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const SORT_FIELDS = ['firstName', 'lastName', 'email', 'createdAt', 'status'];
    const orderBy = SORT_FIELDS.includes(sortBy)
      ? { [sortBy]: sortOrder }
      : { lastName: 'asc' as const };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          mandats: {
            where: { status: MandateStatus.ACTIVE, deletedAt: null },
            select: { id: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async exportCsv(filters: Parameters<typeof ClientService.getClients>[0]) {
    const { data: clients } = await ClientService.getClients({ ...filters, limit: 10000, page: 1 });

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Société', 'Statut', 'Source', 'Mandats actifs', 'Date création'];
    const rows = clients.map(c => [
      c.id,
      c.firstName,
      c.lastName,
      c.email,
      c.phone ?? '',
      c.company ?? '',
      c.status,
      c.wpId ? 'WordPress' : 'CRM',
      (c.mandats as { id: string }[]).length,
      new Date(c.createdAt).toLocaleDateString('fr-CH'),
    ].map(esc).join(','));

    return [header.map(esc).join(','), ...rows].join('\r\n');
  }

  static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { mandats: true }
    });

    if (!client || client.deletedAt) {
      throw new NotFoundError('Client non trouvé');
    }

    return client;
  }

  static async updateClient(id: string, data: Partial<z.infer<typeof ClientSchema>>, userId: string) {
    const current = await this.getClientById(id);

    const validatedData = ClientSchema.partial().parse(data);

    if (validatedData.email && validatedData.email !== current.email) {
      const conflict = await prisma.client.findUnique({ where: { email: validatedData.email } });
      if (conflict) throw new ValidationError('Un client avec cet email existe déjà');
    }

    if (validatedData.phone && validatedData.phone !== current.phone) {
      const conflict = await prisma.client.findFirst({ where: { phone: validatedData.phone, deletedAt: null } });
      if (conflict) throw new ValidationError('Un client avec ce numéro de téléphone existe déjà');
    }

    const updated = await prisma.client.update({
      where: { id },
      data: validatedData
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
    await this.getClientById(id); // throws NotFoundError if missing or already deleted

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

  static async addNote(clientId: string, text: string, userId: string) {
    await this.getClientById(clientId); // 404 si inexistant
    return AuditService.log({
      userId,
      action: 'NOTE',
      entity: 'Client',
      entityId: clientId,
      newValue: { text },
    });
  }

  static async getNotes(clientId: string) {
    return AuditService.getLogs({
      entity: 'Client',
      entityId: clientId,
      action: 'NOTE',
      limit: 100,
    });
  }

  static async checkDuplicate(data: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }) {
    const orConditions: Prisma.ClientWhereInput[] = [];
    if (data.email) orConditions.push({ email: { equals: data.email, mode: 'insensitive' } });
    if (data.firstName) orConditions.push({ firstName: { contains: data.firstName, mode: 'insensitive' } });
    if (data.lastName) orConditions.push({ lastName: { contains: data.lastName, mode: 'insensitive' } });

    const [nameCandidates, phoneCandidates] = await Promise.all([
      orConditions.length > 0
        ? prisma.client.findMany({ where: { deletedAt: null, OR: orConditions } })
        : Promise.resolve([]),
      data.phone
        ? prisma.client.findMany({ where: { deletedAt: null, phone: { not: null } }, take: 200 })
        : Promise.resolve([]),
    ]);

    const byId = new Map([
      ...nameCandidates.map(c => [c.id, c] as const),
      ...phoneCandidates.map(c => [c.id, c] as const),
    ]);

    const normalizedInputPhone = data.phone ? normalizePhone(data.phone) : null;

    const duplicates = [...byId.values()]
      .map(client => {
        const reasons: string[] = [];
        let score = 0;

        if (data.email && client.email.toLowerCase() === data.email.toLowerCase()) {
          score += 60;
          reasons.push('Email identique');
        }

        if (normalizedInputPhone && client.phone && normalizePhone(client.phone) === normalizedInputPhone) {
          score += 30;
          reasons.push('Téléphone identique');
        }

        if (data.firstName && data.lastName) {
          const sim = bigramSimilarity(
            `${data.firstName} ${data.lastName}`,
            `${client.firstName} ${client.lastName}`
          );
          if (sim >= 0.85) {
            score += 25;
            reasons.push('Nom complet identique');
          } else if (sim >= 0.5) {
            score += Math.round(sim * 20);
            reasons.push('Nom similaire');
          }
        }

        if (data.company && client.company &&
          client.company.toLowerCase() === data.company.toLowerCase()) {
          score += 10;
          reasons.push('Société identique');
        }

        return { client, score: Math.min(score, 100), reasons };
      })
      .filter(r => r.score >= 30)
      .sort((a, b) => b.score - a.score);

    return { duplicates };
  }
}
