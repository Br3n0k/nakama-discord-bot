// backend/src/routes/bot.js

// Acesso ao mock de sessões (deveria vir de um serviço)
import UserRoutes from './user.js'; // Para acessar mockSessions
const { mockSessions } = UserRoutes; // Temporário

// Acesso aos activeAudioStreams (deveria vir de um serviço ou ser injetado)
import AudioRoutes from './audio.js'; // Para acessar activeAudioStreams
const { activeAudioStreams } = AudioRoutes; // Temporário


async function botRoutes(fastify, options) {
  // Esta rota seria chamada pelo próprio Bot do Discord (que roda em outro processo/módulo)
  // quando ele precisa interagir com o backend, por exemplo, para verificar uma sessão
  // ou para sinalizar que está pronto para receber áudio.
  // Alternativamente, o bot pode usar funções exportadas diretamente se estiver no mesmo projeto/monorepo.

  // POST /bot/connect - Chamado pelo bot para validar sessão e se preparar para stream
  // O bot do Discord, ao receber o comando /music <id_sessao>, chamaria esta API
  // para validar a sessão e informar ao backend que está pronto.
  fastify.post('/bot/connect', { onRequest: [fastify.authenticateBot] }, async (request, reply) => {
    // fastify.authenticateBot seria um hook para autenticar o bot (ex: via API key secreta)
    const { session_id: sessionId, discord_user_id: discordUserId, voice_channel_id: voiceChannelId } = request.body;

    if (!sessionId || !discordUserId || !voiceChannelId) {
      return reply.code(400).send({ error: 'session_id, discord_user_id, e voice_channel_id são obrigatórios.' });
    }

    // 1. Validar a sessão
    const session = mockSessions.get(sessionId);
    if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
      fastify.log.warn(`Bot tentou conectar com sessão inválida/expirada: ${sessionId}`);
      return reply.code(403).send({ error: 'Sessão inválida ou expirada.' });
    }

    // 2. Verificar se a sessão pertence ao usuário do Discord que invocou o comando
    //    (Esta verificação pode ser mais robusta, comparando o user_id da sessão com o discordUserId)
    //    const userOwningTheSession = Array.from(UserRoutes.mockUsers.values()).find(u => u.id === session.user_id);
    //    if (!userOwningTheSession || userOwningTheSession.discord_id !== discordUserId) {
    //        fastify.log.warn(`Bot tentou conectar sessão ${sessionId} para usuário ${discordUserId}, mas a sessão pertence a outro usuário.`);
    //        return reply.code(403).send({ error: 'ID de sessão não corresponde ao usuário.' });
    //    }
    //    Por ora, vamos simplificar e assumir que a validação do dono da sessão é feita pelo bot.

    fastify.log.info(`Bot (usuário Discord ${discordUserId}) conectando à sessão ${sessionId} para o canal de voz ${voiceChannelId}`);

    // 3. Sinalizar que o bot está pronto para receber áudio para esta sessão
    //    Isto pode envolver configurar um stream ou callback no módulo de áudio.
    const audioStreamData = activeAudioStreams.get(sessionId);
    if (audioStreamData && audioStreamData.websocket) {
      audioStreamData.botInfo = {
        discordUserId,
        voiceChannelId,
        connectedAt: new Date(),
      };
      // Aqui, o backend poderia notificar o App de Captura que o bot está conectado, se necessário.
      // Ex: audioStreamData.websocket.send(JSON.stringify({ type: 'bot_connected', channel: voiceChannelId }));
      
      fastify.log.info(`Bot conectado. Sessão ${sessionId} agora tem um ouvinte de bot.`);
      reply.send({ status: 'connected', message: 'Bot conectado e pronto para receber áudio.' });

      // O bot agora precisaria chamar `fastify.getAudioStreamForSession(sessionId)`
      // ou um mecanismo similar para obter o fluxo de áudio.
      // Esta rota HTTP é mais para validação e sinalização.

    } else {
      fastify.log.warn(`Bot tentou conectar à sessão ${sessionId}, mas nenhum App de Captura está transmitindo (sem WebSocket ativo).`);
      reply.code(404).send({ error: 'Nenhum stream de áudio ativo do App de Captura para esta sessão.' });
    }
  });

  // Outras rotas que o bot poderia usar:
  // POST /bot/disconnect { session_id } -> Informa que o bot desconectou do canal de voz
  // GET /bot/session/:session_id/status -> Bot pergunta o status da sessão de áudio
}

export default botRoutes;
