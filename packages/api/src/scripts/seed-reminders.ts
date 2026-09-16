import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding reminder templates...');

  const templates = [
    {
      code: 'PAYMENT_REMINDER_7',
      name: 'Relance de paiement (J+7)',
      subject: 'Relance : Facture impayée - {{invoiceReference}}',
      htmlBody: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
  <div style="background-color: #f8b400; padding: 20px; text-align: center;">
    <h2 style="color: #fff; margin: 0;">Rappel de paiement (J+7)</h2>
  </div>
  <div style="padding: 20px;">
    <p>Bonjour {{clientName}},</p>
    <p>Sauf erreur ou omission de notre part, le paiement de la facture <strong>{{invoiceReference}}</strong> d'un montant de <strong>{{amount}} CHF</strong> pour le mandat "{{mandatTitle}}" n'a pas encore été reçu.</p>
    <p>La date d'échéance était fixée au <strong>{{dueDate}}</strong> (retard de {{delayDays}} jours).</p>
    <p>Nous vous serions reconnaissants de bien vouloir procéder à son règlement dans les plus brefs délais.</p>
    <br/>
    <p>Cordialement,<br/>L'équipe Digitaldetectives</p>
  </div>
</div>
      `,
      variables: {
        clientName: 'Nom du client',
        invoiceReference: 'Référence de la facture',
        amount: 'Montant TTC',
        dueDate: 'Date d\'échéance',
        mandatTitle: 'Titre du mandat',
        delayDays: 'Nombre de jours de retard'
      }
    },
    {
      code: 'PAYMENT_REMINDER_14',
      name: 'Relance de paiement (J+14)',
      subject: '2ème Relance : Facture impayée - {{invoiceReference}}',
      htmlBody: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
  <div style="background-color: #e67e22; padding: 20px; text-align: center;">
    <h2 style="color: #fff; margin: 0;">2ème Rappel de paiement (J+14)</h2>
  </div>
  <div style="padding: 20px;">
    <p>Bonjour {{clientName}},</p>
    <p>Nous vous informons que le paiement de la facture <strong>{{invoiceReference}}</strong> d'un montant de <strong>{{amount}} CHF</strong> est toujours en attente.</p>
    <p>Échéance initiale : <strong>{{dueDate}}</strong> (retard de {{delayDays}} jours).</p>
    <p>Veuillez procéder au paiement immédiatement pour éviter des frais de retard.</p>
    <br/>
    <p>Cordialement,<br/>L'équipe Digitaldetectives</p>
  </div>
</div>
      `,
      variables: {
        clientName: 'Nom du client',
        invoiceReference: 'Référence de la facture',
        amount: 'Montant TTC',
        dueDate: 'Date d\'échéance',
        mandatTitle: 'Titre du mandat',
        delayDays: 'Nombre de jours de retard'
      }
    },
    {
      code: 'PAYMENT_REMINDER_30',
      name: 'Mise en demeure (J+30)',
      subject: 'Mise en demeure : Facture impayée - {{invoiceReference}}',
      htmlBody: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
  <div style="background-color: #e74c3c; padding: 20px; text-align: center;">
    <h2 style="color: #fff; margin: 0;">Mise en demeure (J+30)</h2>
  </div>
  <div style="padding: 20px;">
    <p>Bonjour {{clientName}},</p>
    <p>Malgré nos précédentes relances, la facture <strong>{{invoiceReference}}</strong> de <strong>{{amount}} CHF</strong> reste impayée.</p>
    <p>La date d'échéance du <strong>{{dueDate}}</strong> est dépassée de {{delayDays}} jours.</p>
    <p>Sans règlement de votre part sous 48 heures, nous serons contraints de transmettre ce dossier à notre service de recouvrement.</p>
    <br/>
    <p>L'équipe Digitaldetectives</p>
  </div>
</div>
      `,
      variables: {
        clientName: 'Nom du client',
        invoiceReference: 'Référence de la facture',
        amount: 'Montant TTC',
        dueDate: 'Date d\'échéance',
        mandatTitle: 'Titre du mandat',
        delayDays: 'Nombre de jours de retard'
      }
    }
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        variables: template.variables
      },
      create: template
    });
  }

  console.log('✅ Templates seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
