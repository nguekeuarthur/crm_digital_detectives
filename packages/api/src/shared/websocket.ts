import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer;

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('🔌 [WebSocket] Nouveau client connecté');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any).isAlive = true;

    ws.on('pong', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any).isAlive = true;
    });

    ws.on('error', (err) => {
      console.error('❌ [WebSocket] Erreur client :', err);
    });

    ws.on('close', () => {
      console.log('🔌 [WebSocket] Client déconnecté');
    });
  });

  // Intervalle pour nettoyer les connexions mortes (keep-alive)
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = ws as any;
      if (client.isAlive === false) {
        console.log('🔌 [WebSocket] Terminaison d\'un client inactif');
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastCallEvent(type: string, data: any) {
  if (!wss) {
    console.warn('⚠️ [WebSocket] Tentative de diffusion avant initialisation du serveur.');
    return;
  }
  const message = JSON.stringify({ type, data });
  console.log(`📡 [WebSocket] Diffusion de l'événement "${type}" à ${wss.clients.size} client(s)...`);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
