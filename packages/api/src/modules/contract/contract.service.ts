import { prisma } from '../../shared/prisma';
import { ValidationError } from '../../shared/errors';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { FileService } from '../file/file.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../mandat/activity.service';

export class ContractService {

  /**
   * Crée un nouveau template de contrat
   */
  static async createTemplate(data: { name: string; htmlContent: string; variables?: string[] }) {
    const template = await prisma.contractTemplate.create({
      data: {
        name: data.name,
        htmlContent: data.htmlContent,
        variables: data.variables || [],
        version: 1,
      }
    });
    return template;
  }

  /**
   * Met à jour un template (versioning)
   */
  static async updateTemplate(id: string, data: { name: string; htmlContent: string; variables?: string[] }) {
    const existing = await prisma.contractTemplate.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Template non trouvé');

    // Archive l'ancienne version
    await prisma.contractTemplate.update({
      where: { id },
      data: { isArchived: true }
    });

    // Crée la nouvelle version
    const newTemplate = await prisma.contractTemplate.create({
      data: {
        name: data.name,
        htmlContent: data.htmlContent,
        variables: data.variables || [],
        version: existing.version + 1,
      }
    });

    return newTemplate;
  }

  /**
   * Génère un contrat PDF pour un mandat donné en utilisant un template
   */
  static async generateContract(templateId: string, mandatId: string, userId: string) {
    // 1. Récupération des données
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.isArchived) {
      throw new ValidationError('Template introuvable ou archivé');
    }

    let resolvedMandatId = mandatId;
    let mandat = null;

    if (resolvedMandatId === 'test-mandat-id-temporaire') {
      mandat = await prisma.mandat.findFirst({
        include: { client: true }
      });
      if (!mandat) {
        throw new ValidationError("Aucun mandat existant trouvé pour le test de génération. Créez un client et un mandat d'abord.");
      }
      resolvedMandatId = mandat.id;
    } else {
      mandat = await prisma.mandat.findUnique({
        where: { id: resolvedMandatId },
        include: { client: true }
      });
    }
    if (!mandat) throw new ValidationError('Mandat non trouvé');

    // Réassignation pour utiliser la vraie ID dans toute la suite
    mandatId = resolvedMandatId;

    // Trouver le dossier standard pour stocker le contrat
    let folder = await prisma.dossier.findFirst({
      where: { mandatId, name: 'Contrats et Administratif' }
    });
    if (!folder) {
      folder = await prisma.dossier.findFirst({
        where: { mandatId }
      });
      if (!folder) {
        folder = await prisma.dossier.create({
          data: {
            name: 'Contrats et Administratif',
            mandatId
          }
        });
      }
    }

    // 2. Compilation Handlebars (avec décodage des entités HTML si jamais stockées échappées)
    const decodedHtml = decodeHTMLEntities(template.htmlContent);
    const compileTemplate = handlebars.compile(decodedHtml);
    const htmlData = {
      client: {
        firstName: mandat.client.firstName,
        lastName: mandat.client.lastName,
        email: mandat.client.email,
        phone: mandat.client.phone,
        company: mandat.client.company,
        address: mandat.client.address,
      },
      mandat: {
        title: mandat.title,
        reference: mandat.id.split('-')[0], // Pseudo référence
        date: new Date().toLocaleDateString('fr-FR'),
      }
    };
    
    const finalHtml = compileTemplate(htmlData);

    // 3. Génération du PDF via Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Pour éviter les crashs sur certains serveurs
    });
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } });
    await browser.close();

    // 4. Stockage du fichier PDF
    const fileName = `Contrat_${mandat.client.lastName}_${Date.now()}.pdf`;
    
    // Buffer conversion because puppeteer's page.pdf returns Uint8Array in newer versions
    const bufferToUpload = Buffer.from(pdfBuffer);
    
    const file = await FileService.uploadFile({
      name: fileName,
      buffer: bufferToUpload,
      mimeType: 'application/pdf',
      size: bufferToUpload.length,
      folderId: folder.id,
      userId
    });

    // 5. Enregistrement en BD du Contrat
    const contract = await prisma.contract.create({
      data: {
        mandatId,
        templateId,
        fileId: file.id,
      }
    });

    // 6. Audit & Activité
    await AuditService.log({
      userId,
      action: 'GENERATE_CONTRACT',
      entity: 'Contract',
      entityId: contract.id,
      newValue: { templateId, mandatId, fileId: file.id }
    });

    await ActivityService.push({
      mandatId,
      userId,
      type: 'FILE_ADDED',
      payload: { fileName, folderName: folder.name, source: 'GENERATOR', contractId: contract.id }
    });

    return { contract, file };
  }
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');
}
