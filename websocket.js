import WebSocket, { WebSocketServer } from 'ws';

const clients = new Map();

let wss;

function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname !== '/ws') {
      console.log('[WS] Invalid WebSocket path:', url.pathname);
      ws.close(1008, 'Invalid WebSocket path');
      return;
    }

    const userId = url.searchParams.get('user_id');

    if (!userId) {
      console.log('[WS] Connection rejected: No user_id');
      ws.close(1008, 'user_id required');
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }

    clients.get(userId).add(ws);
    console.log(`[WS] User ${userId} connected. Total connections: ${clients.get(userId).size}`);

    ws.on('close', () => {
      const conns = clients.get(userId);
      if (conns) {
        conns.delete(ws);
        if (conns.size === 0) {
          clients.delete(userId);
          console.log(`[WS] User ${userId} disconnected. All connections closed.`);
        } else {
          console.log(`[WS] User ${userId} disconnected. Remaining connections: ${conns.size}`);
        }
      }
    });
  });
}

function broadcastMessageToChannel(channelId, message) {
  if (!wss) {
    console.log('[WS] No WebSocket server initialized');
    return;
  }

  if (!message) {
    console.log('[WS] Broadcast failed: message is null');
    return;
  }

  const { userId0, userId1 } = message.channelParticipants || {};
  if (!userId0 && !userId1) {
    console.log('[WS] Broadcast failed: no channel participants found');
    return;
  }

  console.log(`[WS] Broadcasting to users: ${userId0}, ${userId1}`);
  
  const notifiedUsers = [userId0, userId1].filter(Boolean);
  notifiedUsers.forEach(userId => {
    const userConns = clients.get(String(userId));
    if (userConns) {
      userConns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'new_message', data: message }));
        }
      });
    }
  });
}

function broadcastMessageReadToChannel(channelId, messageId, channelParticipants) {
  if (!wss) {
    console.log('[WS] No WebSocket server initialized');
    return;
  }

  const { userId0, userId1 } = channelParticipants || {};
  const notifiedUsers = [userId0, userId1].filter(Boolean);

  console.log(`[WS] Broadcasting message read for message ${messageId} to users: ${notifiedUsers.join(', ')}`);

  notifiedUsers.forEach(userId => {
    const userConns = clients.get(String(userId));
    if (userConns) {
      userConns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'message_read',
            data: {
              message_id: messageId,
              channel_id: channelId,
            },
          }));
        }
      });
    }
  });
}

function broadcastChannelDeleted(channelId, channelParticipants) {
  console.log(`[WS] enter broadcastChannelDeleted for channel ${channelId}`);
  if (!wss) {
    console.log('[WS] no wss instance');
    return;
  }
  const { userId0, userId1 } = channelParticipants;
  [userId0, userId1].filter(Boolean).forEach(uid => {
    const conns = clients.get(String(uid)) || new Set();
    console.log(`[WS] user ${uid} has ${conns.size} connections`);
    conns.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'channel_deleted',
          data: { channel_id: channelId },
        }));
        console.log(`[WS] sent channel_deleted to user ${uid}`);
      }
    });
  });
}



export {
  setupWebSocket,
  broadcastMessageToChannel,
  broadcastMessageReadToChannel,
  broadcastChannelDeleted
};
