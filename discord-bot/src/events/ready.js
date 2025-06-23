// discord-bot/src/events/ready.js
import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true, // Este evento deve ser executado apenas uma vez
  execute(client) {
    // Este console.log é redundante se já estiver no bot.js, mas serve como exemplo de arquivo de evento.
    console.log(`[EVENTO READY] Cliente ${client.user.tag} está pronto e operando!`);

    // Exemplo: Definir uma atividade para o bot
    try {
      client.user.setPresence({
        activities: [{ name: 'o áudio do seu PC | /music', type: 'LISTENING' }], // Tipos: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
        status: 'online', // 'online', 'idle', 'dnd', 'invisible'
      });
      console.log(`[INFO] Status de presença do bot definido com sucesso.`);
    } catch (error) {
      console.error('[ERRO] Falha ao definir status de presença do bot:', error);
    }

    // Outras ações que podem ser executadas quando o bot está pronto:
    // - Carregar configurações de guilds
    // - Iniciar timers ou tarefas agendadas
    // - Conectar a outros serviços (se necessário)
  },
};
