// backend/src/routes/audio.js

// Mock de "streams" de áudio ativas por session_id
// Em uma implementação real, isso seria mais complexo, envolvendo buffers,
// talvez pipes para o bot do Discord, etc.
const activeAudioStreams = new Map(); // session_id -> { websocketConnection, buffer, botConnection, etc. }

async function audioRoutes(fastify, options) {
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
    
    // Verificar se a sessão é válida (ex: consultando o mockSessions ou DB)
    // const session = fastify.mockSessions.get(sessionId); // Supondo que mockSessions está acessível
    // if (!session || !session.is_active) {
    //   fastify.log.warn(`Conexão WebSocket recusada para sessão inválida ou inativa: ${sessionId}`);
    //   connection.socket.send(JSON.stringify({ error: 'Sessão inválida ou inativa' }));
    //   connection.socket.close(1008, "Sessão inválida ou inativa");
    //   return;
    // }

    fastify.log.info(`Cliente de áudio conectado para sessão: ${sessionId}`);
    activeAudioStreams.set(sessionId, { 
      websocket: connection.socket, 
      receivedAt: new Date(),
      // Outros metadados podem ser armazenados aqui, como o bot que deve receber este áudio
    });

    connection.socket.on('message', message => {
      // Mensagem pode ser um Buffer de áudio (PCM, Opus) ou JSON com metadados.
      // O formato exato precisa ser definido entre o App de Captura e o Backend.
      
      // Exemplo: se for Buffer de áudio
      if (Buffer.isBuffer(message)) {
        // fastify.log.info(`Recebido chunk de áudio (${message.length} bytes) para sessão ${sessionId}`);
        // TODO: Processar o chunk de áudio:
        // 1. Adicionar a um buffer para esta sessão.
        // 2. Se houver um bot do Discord conectado e esperando por este áudio,
        //    encaminhar o áudio para o bot (ex: via um Event Emitter, Redis Pub/Sub, ou diretamente se no mesmo processo).
        
        const streamData = activeAudioStreams.get(sessionId);
        if (streamData && streamData.botAudioStream) {
          // Exemplo: se o botDiscord fornecer um WritableStream para o áudio
           streamData.botAudioStream.write(message);
        } else {
          // Armazenar em buffer se o bot não estiver pronto, ou descartar, ou logar.
          // console.log(`Áudio recebido para ${sessionId}, mas nenhum bot está ouvindo.`);
        }

      } else {
        try {
          const parsedMessage = JSON.parse(message.toString());
          fastify.log.info(`Recebida mensagem JSON de ${sessionId}:`, parsedMessage);
          // Lidar com comandos ou metadados enviados pelo App de Captura
          // Ex: { type: 'start_stream', format: 'opus', sampleRate: 48000 }
          // Ex: { type: 'ping' }
          if (parsedMessage.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }

        } catch (e) {
          fastify.log.warn(`Recebida mensagem não-buffer e não-JSON de ${sessionId}: ${message.toString()}`);
        }
      }
    });

    connection.socket.on('close', (code, reason) => {
      fastify.log.info(`Cliente de áudio desconectado para sessão ${sessionId}. Code: ${code}, Reason: ${reason?.toString()}`);
      const streamData = activeAudioStreams.get(sessionId);
      if (streamData && streamData.botAudioStream) {
        // Sinalizar ao bot que a stream de áudio terminou
        streamData.botAudioStream.end();
      }
      activeAudioStreams.delete(sessionId);
    });

    connection.socket.on('error', error => {
      fastify.log.error(`Erro no WebSocket de áudio para sessão ${sessionId}:`, error);
      // A conexão 'close' também será chamada.
    });

    // Enviar uma mensagem de boas-vindas ou confirmação
    connection.socket.send(JSON.stringify({ status: 'connected', message: `Conectado ao servidor de áudio para sessão ${sessionId}` }));
  });

  // Rota para o bot do Discord se inscrever para receber áudio de uma sessão
  // (Este é um exemplo de como o bot poderia obter o áudio, pode ser um EventEmitter interno)
  // Esta não é uma rota HTTP pública, mas uma função que o módulo do bot chamaria.
  fastify.decorate('getAudioStreamForSession', (sessionIdToListen) => {
    // Retorna um ReadableStream ou um mecanismo para o bot receber os chunks de áudio.
    // Isso precisa ser implementado com mais cuidado.
    // Por exemplo, o bot poderia registrar um callback ou receber um stream.
    fastify.log.info(`Bot solicitando stream de áudio para sessão: ${sessionIdToListen}`);
    
    const streamData = activeAudioStreams.get(sessionIdToListen);
    if (streamData) {
        // Se já existe uma conexão WebSocket do App de Captura
        // Precisamos de um mecanismo para encaminhar os dados.
        // Exemplo simplista:
        // const passthrough = new PassThrough();
        // streamData.botAudioStream = passthrough; // O áudio recebido no WS será escrito aqui
        // return passthrough; // O bot lê deste stream

        // Placeholder:
        return {
            onData: (callback) => {
                // Armazena o callback para ser chamado quando dados chegarem
                if (streamData) streamData.onBotDataCallback = callback;
            },
            onEnd: (callback) => {
                if (streamData) streamData.onBotEndCallback = callback;
            },
            stop: () => {
                if (streamData) {
                    delete streamData.onBotDataCallback;
                    delete streamData.onBotEndCallback;
                    // streamData.botAudioStream?.destroy();
                    // delete streamData.botAudioStream;
                }
                fastify.log.info(`Bot parou de ouvir a sessão ${sessionIdToListen}`);
            }
        };
    }
    return null; // Ou lançar erro se a sessão não estiver ativa
  });

  // Hook para adicionar activeAudioStreams ao fastify instance para acesso em outros lugares (ex: bot route)
  // fastify.decorate('activeAudioStreams', activeAudioStreams); // Já está no escopo do plugin

}

// Expor activeAudioStreams para o bot.js poder interagir (temporário)
audioRoutes.activeAudioStreams = activeAudioStreams;

export default audioRoutes;
