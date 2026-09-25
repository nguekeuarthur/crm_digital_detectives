import { app } from './app';
import http from 'http';
import { initWebSocketServer } from './shared/websocket';
import { startBillingCron } from './modules/billing/billing.cron';

const port = process.env.PORT || 3000;
const server = http.createServer(app);

initWebSocketServer(server);

// Démarrer les tâches planifiées
startBillingCron();

server.listen(port, () => {
  console.log(`
🚀 CRM Digitaldetectives API (avec WebSockets)
📡 Statut: En ligne
🔗 URL: http://localhost:${port}
🛠️  Mode: ${process.env.NODE_ENV || 'development'}
  `);
});
