import 'dotenv/config';
import { MailService } from '../src/modules/mail/mail.service';

async function testEmail() {
  console.log('🧪 Test d\'envoi d\'email via Infomaniak...');
  
  try {
    await MailService.sendMail({
      to: 'edimaevina@gmail.com', // Je teste vers une adresse externe ou la tienne
      subject: 'Test CRM Digitaldetectives',
      text: 'Ceci est un test de connexion SMTP réussi !',
      html: '<h1>Succès !</h1><p>Le CRM est maintenant capable d\'envoyer des emails réels.</p>'
    });
    console.log('✅ Test réussi !');
  } catch (error) {
    console.error('❌ Échec du test :', error);
  }
}

testEmail();
