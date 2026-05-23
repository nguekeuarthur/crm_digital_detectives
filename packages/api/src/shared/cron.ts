import cron from 'node-cron';
import { AuditService } from '../modules/audit/audit.service';

/**
 * Initialisation des tâches de fond (Cron Jobs)
 * Ces tâches tournent à l'intérieur du processus API
 */
export const initCronJobs = () => {
  console.log('🕒 Initialisation des tâches de fond...');

  // 1. Archivage des logs d'audit (Tous les jours à minuit)
  // Format : minutes hours dayOfMonth month dayOfWeek
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 [CRON] Archivage automatique des logs d\'audit...');
    try {
      await AuditService.archiveOldLogs(365);
    } catch (error) {
      console.error('❌ [CRON] Erreur lors de l\'archivage des logs:', error);
    }
  });

  // 2. Révocation des accès sous-traitants expirés (Tous les jours à minuit)
  cron.schedule('0 0 * * *', async () => {
    console.log('🚫 [CRON] Vérification des accès sous-traitants expirés...');
    try {
      const { SubcontractorService } = await import('../modules/subcontractor/subcontractor.service');
      await SubcontractorService.revokeExpiredAccess();
    } catch (error) {
      console.error('❌ [CRON] Erreur lors de la révocation des accès:', error);
    }
  });

  // 3. Purge de rétention et notifications J-7 (Tous les jours à minuit)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔒 [CRON] Exécution de la politique de rétention des données...');
    try {
      const { RetentionService } = await import('../modules/retention/retention.service');
      const { ExportService } = await import('../modules/export/export.service');
      const warningsSent = await RetentionService.sendWarnings();
      const purgeResult = await RetentionService.runPurge();
      await ExportService.cleanupExports();
      console.log(`✅ [CRON] Rétention traitée : ${warningsSent} alertes envoyées, purge :`, purgeResult, 'et exports expirés nettoyés');
    } catch (error) {
      console.error('❌ [CRON] Erreur lors du traitement de la rétention et nettoyage des exports:', error);
    }
  });

  // 4. Synchronisation automatique des e-mails IMAP (Toutes les 2 minutes)
  cron.schedule('*/2 * * * *', async () => {
    console.log('📬 [CRON] Synchronisation automatique des e-mails (IMAP)...');
    try {
      const { MailSyncService } = await import('../modules/mail/mail-sync.service');
      await MailSyncService.syncEmails();
    } catch (error) {
      console.error('❌ [CRON] Erreur lors de la synchronisation automatique des e-mails :', error);
    }
  });
};
