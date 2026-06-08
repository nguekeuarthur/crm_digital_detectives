import 'dotenv/config';
import { PrismaClient, MandatStatus, ClientStatus } from '@prisma/client';
import { csrfProtection } from './src/shared/middlewares/csrf.js';
import { xssSanitizer } from './src/shared/middlewares/xss.js';
import { RetentionService } from './src/modules/retention/retention.service.js';
import { ExportService } from './src/modules/export/export.service.js';
import { ExportController } from './src/modules/export/export.controller.js';
import { MailService } from './src/modules/mail/mail.service.js';
import { StorageService } from './src/modules/file/storage.service.js';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Mock du service mail pour éviter l'envoi réel lors des tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
MailService.sendMail = async (options: any) => {
  console.log(`  ✉️ [MOCK MAIL] Destinataire : ${options.to} | Sujet : ${options.subject}`);
  return { messageId: 'mocked-message-id' } as any;
};

// Simulation d'une réponse Express
class MockResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  cookies: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonData: any = null;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookie(name: string, value: string, options?: any) {
    this.cookies[name] = value;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json(data: any) {
    this.jsonData = data;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe(dest: any) {
    // Simule le flux de pipe sans planter
    return dest;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  write(chunk: any) {
    return true;
  }

  on(event: string, listener: (...args: any[]) => void) {
    return this;
  }

  once(event: string, listener: (...args: any[]) => void) {
    return this;
  }

  emit(event: string, ...args: any[]) {
    return this;
  }

  end() {
    return this;
  }
}

async function testCSRF() {
  console.log('\n--- 1. TEST MIDDLEWARE CSRF (Double Submit Cookie) ---');

  // Test GET (méthode de lecture) -> doit autoriser et injecter le cookie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req1: any = {
    method: 'GET',
    cookies: {},
    headers: {}
  };
  const res1 = new MockResponse();
  let nextCalled1 = false;
  csrfProtection(req1, res1 as any, () => { nextCalled1 = true; });

  assert.strictEqual(nextCalled1, true);
  assert.ok(req1.csrfToken);
  assert.strictEqual(res1.cookies.csrfToken, req1.csrfToken);
  console.log('✅ GET sans token CSRF : autorisé, token injecté et cookie configuré.');

  // Test POST sans en-tête CSRF -> doit rejeter (403)
  const token = req1.csrfToken;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req2: any = {
    method: 'POST',
    originalUrl: '/api/v1/clients',
    cookies: { csrfToken: token },
    headers: {}
  };
  const res2 = new MockResponse();
  let nextCalled2 = false;
  csrfProtection(req2, res2 as any, () => { nextCalled2 = true; });

  assert.strictEqual(nextCalled2, false);
  assert.strictEqual(res2.statusCode, 403);
  assert.strictEqual(res2.jsonData.error.code, 'CSRF_VALIDATION_FAILED');
  console.log('✅ POST sans en-tête CSRF : bloqué avec succès (403).');

  // Test POST avec en-tête CSRF correspondant -> doit autoriser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req3: any = {
    method: 'POST',
    originalUrl: '/api/v1/clients',
    cookies: { csrfToken: token },
    headers: { 'x-csrf-token': token }
  };
  const res3 = new MockResponse();
  let nextCalled3 = false;
  csrfProtection(req3, res3 as any, () => { nextCalled3 = true; });

  assert.strictEqual(nextCalled3, true);
  console.log('✅ POST avec en-tête CSRF valide : autorisé avec succès.');

  // Test POST sur route Webhook (/api/v1/webhooks) -> doit être exempté
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req4: any = {
    method: 'POST',
    originalUrl: '/api/v1/webhooks/wordpress',
    cookies: {},
    headers: {}
  };
  const res4 = new MockResponse();
  let nextCalled4 = false;
  csrfProtection(req4, res4 as any, () => { nextCalled4 = true; });

  assert.strictEqual(nextCalled4, true);
  console.log('✅ POST sur route Webhook (/api/v1/webhooks) : exempté et autorisé.');
}

async function testXSS() {
  console.log('\n--- 2. TEST MIDDLEWARE XSS SANITIZER ---');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any = {
    body: {
      title: '<script>alert("xss")</script>',
      nested: {
        comment: 'Hello <img src="x" onerror="steal()"/> world'
      }
    },
    query: {
      search: '<iframe src="evil.com"></iframe>'
    },
    params: {
      id: '<b onload="evil()">123</b>'
    }
  };

  xssSanitizer(req, {} as any, () => {});

  assert.strictEqual(req.body.title, '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  assert.strictEqual(req.body.nested.comment, 'Hello &lt;img src=&quot;x&quot; onerror=&quot;steal()&quot;&#x2F;&gt; world');
  assert.strictEqual(req.query.search, '&lt;iframe src=&quot;evil.com&quot;&gt;&lt;&#x2F;iframe&gt;');
  assert.strictEqual(req.params.id, '&lt;b onload=&quot;evil()&quot;&gt;123&lt;&#x2F;b&gt;');

  console.log('✅ Toutes les balises HTML et injections JS ont été assainies en entités HTML.');
}

async function testRetention(prisma: PrismaClient) {
  console.log('\n--- 3. TEST GESTION DE LA RÉTENTION LPD (#125) ---');

  // S'assurer qu'au moins une politique par défaut existe
  await RetentionService.createOrUpdatePolicy({
    entityType: 'MANDATE',
    triggerEvent: 'MANDATE_CLOSED',
    retentionDays: 30,
    action: 'DELETE'
  });

  const nowSuffix = Date.now();

  // 1. Préparer un Client et un Mandat expiré
  const client = await prisma.client.create({
    data: {
      firstName: 'Retention',
      lastName: 'Client',
      email: `test-retention-${nowSuffix}@detective.ch`,
      status: ClientStatus.ACTIF
    }
  });

  const expiredMandat = await prisma.mandat.create({
    data: {
      title: 'Enquête Secrète Expirée',
      clientId: client.id,
      status: MandatStatus.TERMINE,
      retentionDays: 0 // Expire immédiatement après modification
    }
  });

  // Forcer la date de modification en arrière dans le passé pour simuler la rétention
  await prisma.$executeRawUnsafe(
    `UPDATE "Mandat" SET "updatedAt" = NOW() - INTERVAL '2 days' WHERE id = '${expiredMandat.id}'`
  );

  // Créer un fichier crypté associé
  const dossier = await prisma.dossier.create({
    data: {
      name: 'Preuves Retention',
      mandatId: expiredMandat.id
    }
  });

  const fileKey = `test-retention-file-${nowSuffix}.txt`;
  const plainText = 'Preuve de fraude confidentielle';
  await StorageService.uploadFile(fileKey, Buffer.from(plainText), 'text/plain');

  const fileRecord = await prisma.file.create({
    data: {
      name: 'preuve.txt',
      key: fileKey,
      size: plainText.length,
      mimeType: 'text/plain',
      folderId: dossier.id
    }
  });

  // 2. Préparer un Mandat en avertissement (J-5 restant)
  const warningMandat = await prisma.mandat.create({
    data: {
      title: 'Mandat en avertissement',
      clientId: client.id,
      status: MandatStatus.TERMINE,
      retentionDays: 5
    }
  });

  // Modifié il y a 2 jours, donc jours restants = 5 - 2 = 3 (éligible J-7)
  await prisma.$executeRawUnsafe(
    `UPDATE "Mandat" SET "updatedAt" = NOW() - INTERVAL '2 days' WHERE id = '${warningMandat.id}'`
  );

  // 3. Test de génération du rapport de rétention
  const report = await RetentionService.getRetentionReport();
  const reportedExpired = report.find(item => item.id === expiredMandat.id);
  const reportedWarning = report.find(item => item.id === warningMandat.id);

  assert.ok(reportedExpired, 'Le mandat expiré doit figurer dans le rapport');
  assert.ok(reportedExpired.daysRemaining <= 0, 'Les jours restants pour le mandat expiré doivent être <= 0');
  assert.ok(reportedWarning, 'Le mandat en avertissement doit figurer dans le rapport');
  assert.ok(reportedWarning.daysRemaining === 3 || reportedWarning.daysRemaining === 4, `Le mandat doit avoir environ 3 jours restants (reçu: ${reportedWarning.daysRemaining})`);
  console.log('✅ Rapport de rétention : identification exacte des mandats expirés et proches d\'expiration.');

  // 4. Test d'envoi d'avertissement J-7 (sendWarnings)
  const sentCount = await RetentionService.sendWarnings();
  assert.ok(sentCount >= 1, 'Au moins un avertissement doit être envoyé');

  // Vérifier la présence du log d'audit d'avertissement
  const auditWarning = await prisma.auditLog.findFirst({
    where: {
      action: 'RETENTION_WARNING_SENT',
      entity: 'Mandat',
      entityId: warningMandat.id
    }
  });
  assert.ok(auditWarning, "L'envoi de l'avertissement a été enregistré dans les logs d'audit");
  console.log('✅ Alertes de rétention (J-7) : notifications envoyées et enregistrées.');

  // 5. Test de purge (runPurge)
  const purgeResult = await RetentionService.runPurge();
  assert.ok(purgeResult.mandatesProcessed >= 1, 'Au moins un mandat doit être purgé');

  // Vérifier que le mandat expiré est effacé de la DB
  const checkMandat = await prisma.mandat.findUnique({ where: { id: expiredMandat.id } });
  assert.strictEqual(checkMandat, null, 'Le mandat expiré doit être supprimé de la DB');

  // Vérifier que les dossiers et fichiers DB sont effacés
  const checkDossier = await prisma.dossier.findUnique({ where: { id: dossier.id } });
  assert.strictEqual(checkDossier, null, 'Le dossier lié au mandat expiré doit être supprimé');
  const checkFile = await prisma.file.findUnique({ where: { id: fileRecord.id } });
  assert.strictEqual(checkFile, null, 'Le fichier lié au dossier doit être supprimé');

  // Vérifier la suppression physique du fichier
  const storagePath = process.env.STORAGE_PATH || './uploads';
  const checkPhysicalFile = fs.existsSync(path.join(storagePath, fileKey));
  assert.strictEqual(checkPhysicalFile, false, 'Le fichier physique chiffré doit être supprimé du stockage');

  // Vérifier le log d'audit de suppression
  const auditDelete = await prisma.auditLog.findFirst({
    where: {
      action: 'RETENTION_AUTO_DELETE',
      entity: 'Mandat',
      entityId: expiredMandat.id
    }
  });
  assert.ok(auditDelete, 'Le log d\'audit de la suppression automatique est enregistré');
  console.log('✅ Purge effective : données DB, fichiers physiques et traces sensibles détruites.');

  // Nettoyage de la base de données
  await prisma.auditLog.deleteMany({
    where: {
      entityId: { in: [expiredMandat.id, warningMandat.id, client.id] }
    }
  });
  await prisma.mandat.deleteMany({
    where: { id: warningMandat.id }
  });
  await prisma.client.delete({
    where: { id: client.id }
  });
}

async function testExport(prisma: PrismaClient) {
  console.log('\n--- 4. TEST PORTABILITÉ DES DONNÉES & EXPORTS ASYNCHRONES ---');

  const nowSuffix = Date.now();

  // 1. Création d'un client et d'un mandat avec un fichier
  const client = await prisma.client.create({
    data: {
      firstName: 'Export',
      lastName: 'User',
      email: `test-export-${nowSuffix}@detective.ch`,
      status: ClientStatus.ACTIF
    }
  });

  const mandat = await prisma.mandat.create({
    data: {
      title: 'Mandat Exportable',
      clientId: client.id,
      status: MandatStatus.OUVERT
    }
  });

  const dossier = await prisma.dossier.create({
    data: {
      name: 'Rapport Final',
      mandatId: mandat.id
    }
  });

  const fileKey = `test-export-file-${nowSuffix}.txt`;
  const fileContent = 'Ceci est le rapport final secret chiffré sur disque.';
  await StorageService.uploadFile(fileKey, Buffer.from(fileContent), 'text/plain');

  const fileRecord = await prisma.file.create({
    data: {
      name: 'rapport.txt',
      key: fileKey,
      size: fileContent.length,
      mimeType: 'text/plain',
      folderId: dossier.id
    }
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  assert.ok(adminUser, 'Au moins un utilisateur administrateur doit exister');

  // 2. Déclenchement de la génération d'export asynchrone
  const exportId = await ExportService.generateMandateExport(mandat.id, adminUser.id, adminUser.email);
  assert.ok(exportId, "La génération doit retourner un identifiant d'export");
  console.log(`⏱️ Export ${exportId} initié en tâche de fond. Attente de génération du ZIP...`);

  // Attendre que le fichier zip soit créé en arrière-plan (max 5 secondes)
  const storagePath = process.env.STORAGE_PATH || './uploads';
  const zipPath = path.join(storagePath, 'exports', `${exportId}.zip`);
  let exists = false;
  for (let i = 0; i < 50; i++) {
    if (fs.existsSync(zipPath)) {
      exists = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  assert.strictEqual(exists, true, "Le fichier zip d'export doit être physiquement écrit");
  console.log('✅ Archive ZIP d\'exportation écrite physiquement avec succès.');

  // 3. Test de téléchargement de l'export via lien temporaire sécurisé
  const token = jwt.sign(
    { exportId, userId: adminUser.id },
    process.env.JWT_SECRET || 'fallback-secret-key-12345',
    { expiresIn: '24h' }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any = {
    params: { id: exportId },
    query: { token }
  };
  const res = new MockResponse();

  await ExportController.downloadExport(req, res as any);
  assert.strictEqual(res.statusCode, 200, "Le statut de téléchargement doit être 200 OK");
  assert.strictEqual(res.headers['Content-Type'], 'application/zip');
  console.log('✅ Téléchargement sécurisé via route publique + JWT de sécurité validé.');

  // Laisser le temps au readstream d'ouvrir et de lire le fichier avant de le supprimer
  await new Promise(resolve => setTimeout(resolve, 200));

  // Nettoyage physique
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  const checkPhysicalFile = path.join(storagePath, fileKey);
  if (fs.existsSync(checkPhysicalFile)) {
    fs.unlinkSync(checkPhysicalFile);
  }

  // Nettoyage DB
  await prisma.auditLog.deleteMany({
    where: {
      entityId: { in: [mandat.id, client.id] }
    }
  });
  await prisma.file.delete({ where: { id: fileRecord.id } });
  await prisma.dossier.delete({ where: { id: dossier.id } });
  await prisma.mandat.delete({ where: { id: mandat.id } });
  await prisma.client.delete({ where: { id: client.id } });
  console.log('✅ Nettoyage des données de test d\'export effectué.');
}

async function runAll() {
  console.log('🚀 DÉBUT DE LA VÉRIFICATION DU STEP 1...');
  const prisma = new PrismaClient();

  try {
    await testCSRF();
    await testXSS();
    await testRetention(prisma);
    await testExport(prisma);

    console.log('\n🎉 TOUS LES TESTS D\'INTÉGRATION ET DE SÉCURITÉ DU STEP 1 SONT AU VERT !');
  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAll();
