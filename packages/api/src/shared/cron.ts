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
};
