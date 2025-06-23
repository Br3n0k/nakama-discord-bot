// backend/src/routes/audio.js

// Mock de "streams" de áudio ativas por session_id
// Em uma implementação real, isso seria mais complexo, envolvendo buffers,
// talvez pipes para o bot do Discord, etc.
const activeAudioStreams = new Map(); // session_id -> { websocketConnection, buffer, botConnection, etc. }

async function audioRoutes(fastify, options) {
  // Rota para verificar status do Capture App para uma sessão
  fastify.post('/audio/status', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sessionId } = request.body;
    
    if (!sessionId) {
      return reply.code(400).send({ error: 'sessionId é obrigatório' });
    }

    // Verificar se há uma conexão WebSocket ativa para esta sessão
    const streamData = activeAudioStreams.get(sessionId);
    const captureAppConnected = streamData && streamData.websocket && streamData.websocket.readyState === 1; // WebSocket.OPEN

    // Verificar se há um bot conectado para esta sessão
    const botConnected = streamData && streamData.botConnected === true;

    return reply.send({
      sessionId,
      captureAppConnected,
      botConnected,
      lastActivity: streamData?.receivedAt || null,
      status: captureAppConnected && botConnected ? 'streaming' : 
              captureAppConnected ? 'capture_ready' :
              botConnected ? 'bot_ready' : 'disconnected'
    });
  });

  // Rota para configurar dispositivo de áudio no Capture App
  fastify.post('/audio/device-config', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sessionId, selectedDeviceId } = request.body;
    
    if (!sessionId || !selectedDeviceId) {
      return reply.code(400).send({ error: 'sessionId e selectedDeviceId são obrigatórios' });
    }

    const streamData = activeAudioStreams.get(sessionId);
    if (!streamData || !streamData.websocket || streamData.websocket.readyState !== 1) {
      return reply.code(404).send({ error: 'Capture App não conectado para esta sessão' });
    }

    // Enviar comando para o Capture App alterar o dispositivo
    try {
      streamData.websocket.send(JSON.stringify({
        type: 'device_config',
        selectedDeviceId,
        timestamp: Date.now()
      }));

      fastify.log.info(`Configuração de dispositivo enviada para sessão ${sessionId}: ${selectedDeviceId}`);
      
      return reply.send({
        message: 'Configuração de dispositivo enviada com sucesso',
        selectedDeviceId
      });
    } catch (error) {
      fastify.log.error(`Erro ao enviar configuração de dispositivo: ${error.message}`);
      return reply.code(500).send({ error: 'Erro ao comunicar com Capture App' });
    }
  });

  // Rota WebSocket para receber chunks de áudio do Electron/App de Captura
  // POST /audio/stream (na verdade, será um upgrade para WebSocket, não um POST tradicional)
  // O caminho aqui é como o fastify-websocket espera.
  // O cliente (Electron app) conectará a ws://localhost:3000/api/audio/stream?sessionId=xxxx
  
  fastify.get('/audio/stream', { websocket: true, onRequest: [fastify.authenticateWs] }, (connection /* SocketStream */, req /* FastifyRequest */) => {
    // fastify.authenticateWs será um hook customizado para autenticar conexões WebSocket
    // Ele deve verificar o token (ex: enviado como query param ou no header Sec-WebSocket-Protocol)
    // e associar a conexão com a session_id.
    // Para este placeholder, vamos assumir que req.user.sessionId está disponível se autenticado.
    
    const sessionId = req.user?.sessionId || req.query.sessionId; // sessionId da query string ou do token autenticado

    if (!sessionId) {
      fastify.log.warn('Tentativa de conexão WebSocket de áudio sem sessionId.');
      connection.socket.send(JSON.stringify({ error: 'sessionId é obrigatório' }));
      connection.socket.close(1008, "sessionId é obrigatório"); // Policy Violation
      return;
    }
    
    // Verificar se a sessão é válida
    const session = fastify.mockSessions?.get(sessionId);
    if (!session || !session.is_active) {
      fastify.log.warn(`Conexão WebSocket recusada para sessão inválida: ${sessionId}`);
      connection.socket.send(JSON.stringify({ error: 'Sessão inválida ou inativa' }));
      connection.socket.close(1008, "Sessão inválida ou inativa");
      return;
    }

    fastify.log.info(`Cliente de áudio conectado para sessão: ${sessionId}`);
    
    // Armazenar dados da conexão
    const streamData = {
      websocket: connection.socket, 
      receivedAt: new Date(),
      sessionId,
      botConnected: false,
      audioBuffer: [], // Buffer para armazenar chunks de áudio
      selectedDeviceId: null
    };
    
    activeAudioStreams.set(sessionId, streamData);

    connection.socket.on('message', message => {
      // Atualizar timestamp da última atividade
      streamData.receivedAt = new Date();
      
      if (Buffer.isBuffer(message)) {
        // Chunk de áudio recebido
        fastify.log.debug(`Chunk de áudio recebido (${message.length} bytes) para sessão ${sessionId}`);
        
        // Armazenar no buffer
        streamData.audioBuffer.push({
          data: message,
          timestamp: Date.now()
        });
        
        // Manter apenas os últimos 100 chunks (para evitar uso excessivo de memória)
        if (streamData.audioBuffer.length > 100) {
          streamData.audioBuffer.shift();
        }
        
        // Se há um bot conectado, encaminhar o áudio
        if (streamData.botConnected && streamData.onBotDataCallback) {
          streamData.onBotDataCallback(message);
        }

      } else {
        try {
          const parsedMessage = JSON.parse(message.toString());
          fastify.log.info(`Mensagem do Capture App (${sessionId}):`, parsedMessage);
          
          switch (parsedMessage.type) {
            case 'ping':
              connection.socket.send(JSON.stringify({ 
                type: 'pong', 
                timestamp: Date.now() 
              }));
              break;
              
            case 'device_selected':
              streamData.selectedDeviceId = parsedMessage.deviceId;
              fastify.log.info(`Dispositivo selecionado para ${sessionId}: ${parsedMessage.deviceId}`);
              break;
              
            case 'audio_start':
              fastify.log.info(`Início de transmissão de áudio para ${sessionId}`);
              break;
              
            case 'audio_stop':
              fastify.log.info(`Fim de transmissão de áudio para ${sessionId}`);
              break;
          }

        } catch (e) {
          fastify.log.warn(`Mensagem inválida de ${sessionId}: ${message.toString()}`);
        }
      }
    });

    connection.socket.on('close', (code, reason) => {
      fastify.log.info(`Cliente de áudio desconectado (${sessionId}). Code: ${code}, Reason: ${reason?.toString()}`);
      
      // Notificar bot se estava conectado
      if (streamData.botConnected && streamData.onBotEndCallback) {
        streamData.onBotEndCallback();
      }
      
      activeAudioStreams.delete(sessionId);
    });

    connection.socket.on('error', error => {
      fastify.log.error(`Erro no WebSocket de áudio (${sessionId}):`, error);
    });

    // Enviar mensagem de boas-vindas
    connection.socket.send(JSON.stringify({ 
      type: 'connected',
      message: `Conectado ao servidor Nakama para sessão ${sessionId}`,
      sessionId,
      timestamp: Date.now()
    }));
  });

  // Função para o bot se inscrever para receber áudio de uma sessão
  fastify.decorate('getAudioStreamForSession', (sessionIdToListen) => {
    fastify.log.info(`Bot solicitando stream de áudio para sessão: ${sessionIdToListen}`);
    
    const streamData = activeAudioStreams.get(sessionIdToListen);
    if (!streamData) {
      return null;
    }

    // Marcar que o bot está conectado
    streamData.botConnected = true;
    
    // Notificar o Capture App que o bot se conectou
    if (streamData.websocket && streamData.websocket.readyState === 1) {
      streamData.websocket.send(JSON.stringify({
        type: 'bot_connected',
        message: 'Bot Discord conectado e pronto para receber áudio',
        timestamp: Date.now()
      }));
    }

    return {
      onData: (callback) => {
        streamData.onBotDataCallback = callback;
        
        // Enviar chunks do buffer se houver
        if (streamData.audioBuffer.length > 0) {
          streamData.audioBuffer.forEach(chunk => {
            callback(chunk.data);
          });
        }
      },
      onEnd: (callback) => {
        streamData.onBotEndCallback = callback;
      },
      stop: () => {
        streamData.botConnected = false;
        delete streamData.onBotDataCallback;
        delete streamData.onBotEndCallback;
        
        // Notificar o Capture App que o bot desconectou
        if (streamData.websocket && streamData.websocket.readyState === 1) {
          streamData.websocket.send(JSON.stringify({
            type: 'bot_disconnected',
            message: 'Bot Discord desconectado',
            timestamp: Date.now()
          }));
        }
        
        fastify.log.info(`Bot parou de ouvir a sessão ${sessionIdToListen}`);
      }
    };
  });

  // Rota para limpar sessões inativas (limpeza automática)
  fastify.get('/audio/cleanup', async (request, reply) => {
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutos
    
    let cleanedCount = 0;
    for (const [sessionId, streamData] of activeAudioStreams.entries()) {
      if (now - streamData.receivedAt.getTime() > timeout) {
        if (streamData.websocket && streamData.websocket.readyState === 1) {
          streamData.websocket.close(1000, 'Timeout de inatividade');
        }
        activeAudioStreams.delete(sessionId);
        cleanedCount++;
      }
    }
    
    fastify.log.info(`Limpeza de sessões: ${cleanedCount} sessões inativas removidas`);
    return reply.send({ cleaned: cleanedCount, active: activeAudioStreams.size });
  });
}

// Expor activeAudioStreams para outros módulos
audioRoutes.activeAudioStreams = activeAudioStreams;

export default audioRoutes;
export { activeAudioStreams };
