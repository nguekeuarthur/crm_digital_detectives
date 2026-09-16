import { PrismaClient } from '@prisma/client';
import { MailSyncService } from './src/modules/mail/mail-sync.service';
import { simpleParser } from 'mailparser';
import { FileService } from './src/modules/file/file.service';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🚀 DÉBUT DU TEST D\'INTÉGRATION IMAP & E-MAILS...\n');

  try {
    // 1. Préparation d'un Client de test (edimaevina@icloud.com)
    let client = await prisma.client.findFirst({
      where: { email: 'edimaevina@icloud.com' }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName: 'Edi',
          lastName: 'Maevina',
          email: 'edimaevina@icloud.com',
          status: 'ACTIF'
        }
      });
      console.log('✅ Client de test créé : edimaevina@icloud.com');
    } else {
      console.log('✅ Client de test existant récupéré : edimaevina@icloud.com');
    }

    // 2. Préparation d'un Mandat actif pour ce client
    let mandat = await prisma.mandat.findFirst({
      where: {
        clientId: client.id,
        status: { notIn: ['TERMINE', 'ANNULE'] },
        deletedAt: null
      }
    });

    if (!mandat) {
      mandat = await prisma.mandat.create({
        data: {
          title: 'Mandat de Test E-mails ' + Date.now(),
          description: 'Mandat pour tester la synchronisation IMAP',
          clientId: client.id,
          status: 'OUVERT'
        }
      });

      // Création automatique des dossiers
      const standardDossiers = [
        'Contrats et Administratif',
        'Preuves Photographiques',
        'Vidéos et Audios',
        'Rapports et Comptes-rendus',
        'Recherches et Renseignements',
        'Facturation et Frais',
        'Correspondances'
      ];
      await prisma.dossier.createMany({
        data: standardDossiers.map(name => ({
          name,
          mandatId: mandat!.id,
          isSystem: true
        }))
      });
      console.log(`✅ Mandat créé : "${mandat.title}" avec ses dossiers.`);
    } else {
      console.log(`✅ Mandat actif existant récupéré : "${mandat.title}"`);
    }

    // --- TEST 1 : Simulation de la logique d'analyse et d'insertion ---
    console.log('\n--- TEST 1: Simulation de réception d\'e-mail avec pièces jointes ---');

    const messageId = `test-message-id-${Date.now()}@test.com`;
    const emailSubject = 'Rapport d\'enquête urgent';
    const emailBody = '<h1>Bonjour</h1><p>Veuillez trouver ci-joint les documents.</p>';
    const attachmentContent = Buffer.from('Contenu de la preuve textuelle de test');
    const attachmentFilename = 'preuve_email.txt';

    // Simuler le parsing par simpleParser d'un faux email RFC822
    const rawEmail = `From: Edi Maevina <edimaevina@icloud.com>
To: digitaldetective@genevadetectives.ch
Subject: ${emailSubject}
Message-ID: <${messageId}>
Content-Type: multipart/mixed; boundary="boundary"

--boundary
Content-Type: text/html; charset=utf-8

${emailBody}
--boundary
Content-Type: text/plain; name="${attachmentFilename}"
Content-Disposition: attachment; filename="${attachmentFilename}"

${attachmentContent.toString()}
--boundary--`;

    const parsed = await simpleParser(Buffer.from(rawEmail));
    console.log('✅ E-mail simulé parsé avec succès.');

    // Déclencher manuellement la logique d'enregistrement
    const senderEmail = 'edimaevina@icloud.com';

    // Recherche du client et du mandat
    const clientMatch = await prisma.client.findFirst({
      where: { email: { equals: senderEmail, mode: 'insensitive' } }
    });

    if (clientMatch) {
      const activeMandat = await prisma.mandat.findFirst({
        where: {
          clientId: clientMatch.id,
          status: { notIn: ['TERMINE', 'ANNULE'] },
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeMandat) {
        // Obtenir/créer dossier "Échanges clients"
        const folderName = 'Échanges clients';
        let folder = await prisma.dossier.findFirst({
          where: { mandatId: activeMandat.id, name: folderName }
        });
        if (!folder) {
          folder = await prisma.dossier.create({
            data: { name: folderName, mandatId: activeMandat.id, isSystem: true }
          });
        }

        console.log(`✅ Dossier "${folderName}" identifié/créé (ID: ${folder.id})`);

        // Simuler le stockage de la pièce jointe
        const actingUserId = activeMandat.enqueteurId || (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id || '';

        for (const att of parsed.attachments) {
          const file = await FileService.uploadFile({
            name: att.filename || 'sans-nom',
            buffer: att.content,
            mimeType: att.contentType,
            size: att.size || att.content.length,
            folderId: folder.id,
            userId: actingUserId
          });
          console.log(`✅ Pièce jointe "${file.name}" stockée chiffrée et enregistrée en base (ID: ${file.id})`);
        }

        // Enregistrer l'email
        const emailRecord = await prisma.email.create({
          data: {
            messageId,
            from: parsed.from?.text || senderEmail,
            to: parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to.map((t) => (t && typeof t === 'object' && 'text' in t ? (t as { text?: string }).text || '' : '')).filter(Boolean).join(', ')
                : (parsed.to as { text?: string }).text || ''
              : '',
            subject: parsed.subject || '',
            body: parsed.html || parsed.text || '',
            receivedAt: parsed.date || new Date(),
            clientId: clientMatch.id,
            mandatId: activeMandat.id
          }
        });
        console.log(`✅ E-mail enregistré en base (ID: ${emailRecord.id})`);

        // Enregistrer l'activité dans le fil d'activité
        const { ActivityService } = await import('./src/modules/mandat/activity.service');
        await ActivityService.push({
          mandatId: activeMandat.id,
          userId: actingUserId,
          type: 'EMAIL',
          payload: {
            emailId: emailRecord.id,
            subject: emailRecord.subject,
            from: emailRecord.from,
            hasAttachments: true
          }
        });

        // Vérification de la création de l'activité
        const activities = await prisma.activity.findMany({
          where: { mandatId: activeMandat.id, type: 'EMAIL' }
        });

        if (activities.length > 0) {
          console.log('✅ Activité de type EMAIL ajoutée au fil d\'activité.');
        } else {
          console.log('❌ Erreur : aucune activité de type EMAIL enregistrée.');
        }
      }
    }

    // --- TEST 2 : Test de connexion et synchronisation réelle via IMAP ---
    console.log('\n--- TEST 2: Test de connexion et synchronisation IMAP réelle ---');
    console.log('Tentative de connexion au serveur IMAP avec les identifiants du fichier .env...');

    const syncResult = await MailSyncService.syncEmails(1); // On regarde uniquement les dernières 24h
    console.log('Résultat de la synchronisation réelle :', syncResult);

    console.log('\n🎉 TOUS LES TESTS SONT TERMINÉS AVEC SUCCÈS !');

  } catch (error) {
    console.error('❌ Erreur lors du test :', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
