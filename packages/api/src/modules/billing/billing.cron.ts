import cron from 'node-cron';
import { prisma } from '../../shared/prisma';
import { EmailQueueService } from '../mail/email-queue.service';
import { InvoiceStatus } from '@prisma/client';

export function startBillingCron() {
  // S'exécute tous les jours à 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [Cron] Démarrage de la vérification des retards de paiement...');
    try {
      await checkOverdueInvoices();
    } catch (error) {
      console.error('❌ [Cron] Erreur lors de la vérification des factures:', error);
    }
  });
  
  console.log('✅ [Cron] Tâche planifiée de vérification des paiements (08:00) enregistrée.');
}

export async function checkOverdueInvoices() {
  const now = new Date();
  
  // On récupère toutes les factures en attente avec une date d'échéance dépassée
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.PENDING,
      dueDate: { lt: now }
    },
    include: {
      mandat: {
        include: { client: true }
      },
      quote: true
    }
  });

  if (overdueInvoices.length === 0) {
    console.log('👍 [Cron] Aucune facture en retard.');
    return;
  }

  let count7 = 0;
  let count14 = 0;
  let count30 = 0;

  for (const invoice of overdueInvoices) {
    if (!invoice.dueDate) continue;

    // Calcul de la différence en jours
    const diffTime = Math.abs(now.getTime() - invoice.dueDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const client = invoice.mandat.client;
    const reference = invoice.quote?.reference || `FACTURE-${invoice.id.substring(0,8).toUpperCase()}`;

    const payload = {
      clientName: `${client.firstName} ${client.lastName}`,
      invoiceReference: reference,
      amount: invoice.amount.toFixed(2),
      dueDate: invoice.dueDate.toLocaleDateString('fr-FR'),
      mandatTitle: invoice.mandat.title,
      delayDays: diffDays
    };

    // J+30
    if (diffDays >= 30 && invoice.reminderLevel < 3) {
      await EmailQueueService.enqueue('PAYMENT_REMINDER_30', client.email, payload);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { reminderLevel: 3 }
      });
      count30++;
    } 
    // J+14
    else if (diffDays >= 14 && diffDays < 30 && invoice.reminderLevel < 2) {
      await EmailQueueService.enqueue('PAYMENT_REMINDER_14', client.email, payload);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { reminderLevel: 2 }
      });
      count14++;
    } 
    // J+7
    else if (diffDays >= 7 && diffDays < 14 && invoice.reminderLevel < 1) {
      await EmailQueueService.enqueue('PAYMENT_REMINDER_7', client.email, payload);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { reminderLevel: 1 }
      });
      count7++;
    }
  }

  console.log(`✅ [Cron] Relances générées : ${count7} (J+7), ${count14} (J+14), ${count30} (J+30).`);
}
