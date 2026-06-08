import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { QuoteService } from './quote.service';
import { PDFService } from './pdf.service';
import { MailService } from '../mail/mail.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import path from 'path';
import fs from 'fs';

export class QuoteController {
  /**
   * Créer un devis brouillon
   */
  static async create(req: AuthRequest, res: Response) {
    const quote = await QuoteService.createQuote(req.body, req.user!.userId);
    res.status(201).json(quote);
  }

  /**
   * Lister les devis
   */
  static async getAll(req: AuthRequest, res: Response) {
    const { mandatId, clientId, status } = req.query;
    const quotes = await QuoteService.getQuotes({
      mandatId: mandatId as string,
      clientId: clientId as string,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: status as any
    });
    res.json(quotes);
  }

  /**
   * Détails d'un devis
   */
  static async getById(req: AuthRequest, res: Response) {
    const quote = await QuoteService.getQuoteById(req.params.id as string);
    res.json(quote);
  }

  /**
   * Mettre à jour le statut
   */
  static async updateStatus(req: AuthRequest, res: Response) {
    const quote = await QuoteService.updateStatus(req.params.id as string, req.body.status, req.user!.userId);
    res.json(quote);
  }

  /**
   * Générer le PDF du devis
   */
  static async generatePdf(req: AuthRequest, res: Response) {
    const pdfPath = await PDFService.generateQuote(req.params.id as string);
    res.json({ message: 'PDF généré avec succès', pdfPath });
  }

  /**
   * Télécharger le PDF du devis
   */
  static async downloadPdf(req: AuthRequest, res: Response) {
    const quote = await QuoteService.getQuoteById(req.params.id as string);

    if (!quote.pdfPath || !fs.existsSync(quote.pdfPath)) {
      // Générer à la volée si pas encore généré
      await PDFService.generateQuote(req.params.id as string);
      const updatedQuote = await QuoteService.getQuoteById(req.params.id as string);
      if (!updatedQuote.pdfPath) {
        return res.status(500).json({ error: 'Impossible de générer le PDF' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${updatedQuote.reference}.pdf"`);
      return fs.createReadStream(updatedQuote.pdfPath).pipe(res);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.reference}.pdf"`);
    fs.createReadStream(quote.pdfPath).pipe(res);
  }

  /**
   * Envoyer le devis par email au client
   */
  static async send(req: AuthRequest, res: Response) {
    const quote = await QuoteService.getQuoteById(req.params.id as string);

    let pdfPath = quote.pdfPath;
    // Générer le PDF si pas encore fait
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = await PDFService.generateQuote(req.params.id as string);
    }

    // Mettre à jour le statut à SENT
    await QuoteService.updateStatus(req.params.id as string, 'SENT', req.user!.userId);

    // Envoi de l'email réel via Infomaniak
    await MailService.sendQuote(
      quote.client.email,
      `${quote.client.firstName} ${quote.client.lastName}`,
      quote.reference,
      pdfPath
    );

    res.json({
      message: `Devis ${quote.reference} envoyé avec succès à ${quote.client.email}`,
      status: 'SENT'
    });
  }
}
