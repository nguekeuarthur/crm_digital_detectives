import { app } from './app';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`
🚀 CRM Digitaldetectives API
📡 Statut: En ligne
🔗 URL: http://localhost:${port}
🛠️  Mode: ${process.env.NODE_ENV || 'development'}
  `);
});
