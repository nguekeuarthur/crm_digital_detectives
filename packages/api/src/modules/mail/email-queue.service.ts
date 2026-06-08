import Handlebars from 'handlebars';
import { prisma } from '../../shared/prisma';
import { MailService } from './mail.service';
import { EmailJobStatus } from '@prisma/client';

/**
 * Service de file d'attente d'e-mails basé sur PostgreSQL (remplace Bull + Redis).
 * 
 * Fonctionnement :
 * 1. `enqueue()` insère un job dans la table EmailJob (statut PENDING).
 * 2. Un cron job appelle `processQueue()` toutes les 2 minutes.
 * 3. Le worker récupère les jobs PENDING, compile le template Handlebars,
 *    envoie l'email via MailService, et met à jour le statut.
 * 4. Les échecs sont retentés jusqu'à `maxAttempts` (par défaut 3).
 */
export class EmailQueueService {

  /**
   * Ajoute un e-mail dans la file d'attente.
   * @param templateCode - Code du template (ex: MANDAT_CREATED)
   * @param recipientEmail - Adresse email du destinataire
   * @param payload - Variables Handlebars à injecter dans le template
   * @param scheduledAt - Date d'envoi planifié (par défaut : maintenant)
   */
  static async enqueue(
    templateCode: string,
    recipientEmail: string,
    payload: Record<string, unknown>,
    scheduledAt?: Date
  ) {
    const job = await prisma.emailJob.create({
      data: {
        templateCode,
        recipientEmail,
        payload: payload as any,
        scheduledAt: scheduledAt || new Date(),
      }
    });

    console.log(`📨 [QUEUE] Email ajouté à la file : ${templateCode} → ${recipientEmail} (job: ${job.id})`);
    return job;
  }

  /**
   * Traite les e-mails en attente dans la file d'attente.
   * Appelé périodiquement par un cron job (toutes les 2 minutes).
   */
  static async processQueue(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    let sent = 0;
    let failed = 0;

    // 1. Récupérer les jobs à traiter (PENDING ou FAILED avec retries restants)
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: { in: [EmailJobStatus.PENDING, EmailJobStatus.FAILED] },
        scheduledAt: { lte: now },
        attempts: { lt: 3 } // maxAttempts par défaut
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10, // Traiter par lot de 10 pour éviter de surcharger le SMTP
    });

    if (jobs.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    console.log(`📬 [QUEUE] Traitement de ${jobs.length} email(s) en attente...`);

    for (const job of jobs) {
      try {
        // 2. Marquer comme en cours de traitement
        await prisma.emailJob.update({
          where: { id: job.id },
          data: { status: EmailJobStatus.PROCESSING, attempts: job.attempts + 1 }
        });

        // 3. Récupérer le template
        const template = await prisma.emailTemplate.findUnique({
          where: { code: job.templateCode }
        });

        if (!template) {
          throw new Error(`Template "${job.templateCode}" introuvable en base de données`);
        }

        // 4. Compiler avec Handlebars
        const compiledSubject = Handlebars.compile(template.subject)(job.payload);
        const compiledBody = Handlebars.compile(template.htmlBody)(job.payload);

        // 5. Envoyer via MailService existant
        await MailService.sendMail({
          to: job.recipientEmail,
          subject: compiledSubject,
          html: compiledBody,
        });

        // 6. Marquer comme envoyé
        await prisma.emailJob.update({
          where: { id: job.id },
          data: { status: EmailJobStatus.SENT, processedAt: new Date(), errorReason: null }
        });

        // 7. Loguer dans AutoEmailLog
        await prisma.autoEmailLog.create({
          data: {
            templateId: template.id,
            recipientEmail: job.recipientEmail,
            status: 'SENT',
            sentAt: new Date(),
          }
        });

        console.log(`✅ [QUEUE] Email envoyé : ${job.templateCode} → ${job.recipientEmail}`);
        sent++;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const errorMsg = error.message || 'Erreur inconnue';
        console.error(`❌ [QUEUE] Échec envoi ${job.templateCode} → ${job.recipientEmail} :`, errorMsg);

        // Marquer comme FAILED
        const updatedJob = await prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.FAILED,
            errorReason: errorMsg,
            processedAt: new Date(),
          }
        });

        // Loguer l'échec si le template existe
        const template = await prisma.emailTemplate.findUnique({
          where: { code: job.templateCode }
        });
        if (template) {
          await prisma.autoEmailLog.create({
            data: {
              templateId: template.id,
              recipientEmail: job.recipientEmail,
              status: 'FAILED',
              errorReason: `Tentative ${updatedJob.attempts}/${job.maxAttempts} - ${errorMsg}`,
            }
          });
        }

        failed++;
      }
    }

    console.log(`📊 [QUEUE] Résultat : ${sent} envoyé(s), ${failed} échoué(s) sur ${jobs.length} traité(s)`);
    return { processed: jobs.length, sent, failed };
  }

  /**
   * Crée les templates par défaut s'ils n'existent pas encore.
   * Appelé au démarrage de l'application.
   */
  static async seedDefaultTemplates(): Promise<void> {
    const defaults = [
      {
        code: 'MANDAT_CREATED',
        name: 'Confirmation de mandat',
        subject: 'Confirmation de votre mandat – {{mandatTitle}}',
        htmlBody: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour {{clientName}},</h2>
    <p>Nous vous confirmons la bonne réception de votre mandat <strong>«&nbsp;{{mandatTitle}}&nbsp;»</strong>.</p>
    <p>Notre équipe d'enquêteurs a été informée et prendra en charge votre dossier dans les meilleurs délais.</p>
    <p>Vous recevrez un e-mail de suivi dès qu'il y aura une avancée significative.</p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
        variables: { clientName: 'Nom du client', mandatTitle: 'Titre du mandat' }
      },
      {
        code: 'MANDAT_CLOSED',
        name: 'Clôture de mandat',
        subject: 'Clôture de votre mandat – {{mandatTitle}}',
        htmlBody: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour {{clientName}},</h2>
    <p>Nous vous informons que votre mandat <strong>«&nbsp;{{mandatTitle}}&nbsp;»</strong> a été clôturé.</p>
    <p>Un rapport complet vous sera transmis dans les prochains jours si ce n'est pas déjà fait.</p>
    <p>Nous restons à votre disposition pour toute question complémentaire.</p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
        variables: { clientName: 'Nom du client', mandatTitle: 'Titre du mandat' }
      },
      {
        code: 'QUOTE_REMINDER_7',
        name: 'Rappel devis J+7',
        subject: 'Rappel : Votre devis {{quoteRef}} est en attente',
        htmlBody: `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Digitaldetectives</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <h2 style="color: #1a1a2e; margin-top: 0;">Bonjour {{clientName}},</h2>
    <p>Nous nous permettons de vous rappeler que le devis <strong>{{quoteRef}}</strong> d'un montant de <strong>{{totalTTC}} CHF TTC</strong> vous a été envoyé il y a 7 jours et est toujours en attente de réponse.</p>
    <p>Ce devis expire le <strong>{{expiresAt}}</strong>. N'hésitez pas à nous contacter si vous avez des questions.</p>
    <br/>
    <p>Cordialement,</p>
    <p><strong>L'équipe Digitaldetectives</strong></p>
  </div>
  <div style="padding: 15px; text-align: center; font-size: 12px; color: #999; background: #f9f9f9; border-radius: 0 0 8px 8px;">
    <p>Ceci est un message automatique, merci de ne pas y répondre directement.</p>
  </div>
</div>`,
        variables: { clientName: 'Nom du client', quoteRef: 'Référence du devis', totalTTC: 'Montant TTC', expiresAt: 'Date d\'expiration' }
      }
    ];

    for (const tpl of defaults) {
      const existing = await prisma.emailTemplate.findUnique({ where: { code: tpl.code } });
      if (!existing) {
        await prisma.emailTemplate.create({ data: tpl });
        console.log(`📝 [SEED] Template email créé : ${tpl.code}`);
      }
    }
  }
}
