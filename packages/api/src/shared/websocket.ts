import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { prisma } from './prisma';

let wss: WebSocketServer;

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  role?: 'visitor' | 'agent';
  visitorId?: string; // S'il s'agit d'un visiteur
}

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: ExtWebSocket) => {
    console.log('🔌 [WebSocket] Nouveau client connecté');
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (err) => {
      console.error('❌ [WebSocket] Erreur client :', err);
    });

    ws.on('message', async (rawData) => {
      try {
        const parsed = JSON.parse(rawData.toString());
        
        if (parsed.type === "chat:join") {
          ws.role = parsed.data.role;
          ws.visitorId = parsed.data.visitorId;
          console.log(`🔌 [WebSocket] Join: ${ws.role} (Visitor ID: ${ws.visitorId})`);
          
          if (ws.role === 'visitor' && ws.visitorId) {
            // Créer ou récupérer la session
            let session = await prisma.chatSession.findUnique({
              where: { visitorId: ws.visitorId }
            });
            
            if (!session) {
              session = await prisma.chatSession.create({
                data: {
                  visitorId: ws.visitorId,
                  status: 'BOT'
                }
              });
            }
          }
        } 
        
        else if (parsed.type === "chat:message") {
          console.log("💬 [WebSocket] Message:", parsed.data);
          const { text, sender, visitorId } = parsed.data;
          
          if (!visitorId) return;

          // Assurer que la session existe et est en mode HUMAN si c'est un agent ou une escalade
          let session = await prisma.chatSession.findUnique({
            where: { visitorId }
          });
          
          if (!session) return;
          
          if (sender === 'bot_event' || sender === 'agent') {
            session = await prisma.chatSession.update({
              where: { visitorId },
              data: { status: 'HUMAN' }
            });
          } else if (sender === 'user' && session.status === 'BOT') {
            // Si l'utilisateur tape un message texte, on bascule en manuel par défaut
            session = await prisma.chatSession.update({
              where: { visitorId },
              data: { status: 'HUMAN' }
            });
          }

          // Enregistrer le message
          const msg = await prisma.chatMessage.create({
            data: {
              sessionId: session.id,
              sender: sender === 'bot_event' ? 'SYSTEM' : (sender === 'user' ? 'USER' : 'AGENT'),
              text
            }
          });

          // Diffuser le message
          wss.clients.forEach((client) => {
            const extClient = client as ExtWebSocket;
            if (extClient !== ws && extClient.readyState === WebSocket.OPEN) {
              
              if (sender === 'agent' && extClient.role === 'visitor' && extClient.visitorId === visitorId) {
                // Envoyer du CRM vers le Visiteur concerné
                extClient.send(JSON.stringify({
                  type: "chat:message",
                  data: { text, sender: 'agent', timestamp: msg.createdAt }
                }));
              } 
              else if ((sender === 'user' || sender === 'bot_event') && extClient.role === 'agent') {
                // Envoyer du Visiteur vers tous les Agents connectés au CRM
                extClient.send(JSON.stringify({
                  type: "chat:message",
                  data: { text, sender: msg.sender, visitorId, timestamp: msg.createdAt }
                }));
              }
            }
          });
        }
      } catch (err) {
        console.error("❌ [WebSocket] Erreur traitement:", err);
      }
    });

    ws.on('close', () => {
      console.log('🔌 [WebSocket] Client déconnecté');
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ExtWebSocket;
      if (client.isAlive === false) {
        console.log('🔌 [WebSocket] Terminaison client inactif');
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastCallEvent(type: string, data: any) {
  if (!wss) return;
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
