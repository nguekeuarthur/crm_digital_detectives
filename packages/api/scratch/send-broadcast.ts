import 'dotenv/config';
import { prisma } from '../src/shared/prisma';
import { MailService } from '../src/modules/mail/mail.service';

async function broadcastEmail() {
  console.log('📢 Lancement de l\'envoi groupé...');

  // 1. Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: { email: true, firstName: true }
  });

  // 2. Récupérer tous les clients (optionnel, mais souvent ce que l'utilisateur veut dire)
  const clients = await prisma.client.findMany({
    select: { email: true, firstName: true }
  });

  const recipients = [...users, ...clients];
  console.log(`👥 Nombre de destinataires trouvés : ${recipients.length}`);

  for (const person of recipients) {
    try {
      console.log(`📧 Envoi à ${person.email}...`);
      await MailService.sendMail({
        to: person.email,
        subject: 'Mise à jour du CRM Digitaldetectives',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #1a1a2e;">Bonjour ${person.firstName},</h1>
            <p>Nous sommes heureux de vous annoncer que le système d'envoi d'emails du <strong>CRM Digitaldetectives</strong> est désormais opérationnel.</p>
            <p>Ceci est un test réel envoyé via nos serveurs sécurisés Infomaniak.</p>
            <br/>
            <p>Bonne journée,</p>
            <p><strong>L'équipe Technique</strong></p>
          </div>
        `
      });
    } catch (error) {
      console.error(`❌ Erreur pour ${person.email} :`, error);
    }
  }

  console.log('✅ Opération terminée.');
}

broadcastEmail().catch(console.error).finally(() => prisma.$disconnect());
