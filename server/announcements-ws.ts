// WebSocket handler for real-time announcements
import { WebSocketServer, WebSocket as WS } from 'ws';
import { Server as HTTPServer } from 'http';

export interface AnnouncementsBroadcaster {
  broadcast: (type: string, data: any) => void;
  setup: (httpServer: HTTPServer) => void;
}

export function createAnnouncementsBroadcaster(): AnnouncementsBroadcaster {
  const clients = new Set<WS>();

  function broadcast(type: string, data: any) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    clients.forEach((client) => {
      try {
        if (client.readyState === WS.OPEN) {
          client.send(message);
        }
      } catch (error) {
        clients.delete(client);
      }
    });
  }

  function setup(httpServer: HTTPServer) {
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);

      // Accept generic websocket upgrades at '/ws' and legacy '/ws/announcements'
      if (url.pathname === '/ws' || url.pathname === '/ws/announcements') {
        wss.handleUpgrade(request, socket, head, (ws: WS) => {
          console.log('✓ Announcements WebSocket connected');
          clients.add(ws);

          ws.on('close', () => {
            clients.delete(ws);
          });

          ws.on('error', (error: any) => {
            clients.delete(ws);
          });
        });
      } else {
        socket.destroy();
      }
    });
  }

  return { broadcast, setup };
}
