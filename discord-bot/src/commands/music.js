// discord-bot/src/commands/music.js
import { SlashCommandBuilder } from 'discord.js';
import { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    entersState, 
    StreamType, 
    AudioPlayerStatus,
    VoiceConnectionStatus 
} from '@discordjs/voice';
// import { PassThrough } from 'stream'; // Para criar um stream de áudio

// URL da API Backend (substituir por variável de ambiente)
const BACKEND_API_URL = process.env.NAKAMA_BACKEND_URL || 'http://localhost:3000/api';
const BOT_API_KEY = process.env.NAKAMA_BOT_API_KEY || 'supersecretbotapikey'; // Chave para autenticar com o backend

// Mock/Placeholder para obter o stream de áudio do backend
// Em uma implementação real, isso se conectaria ao backend (ex: via WebSocket ou um endpoint que retorna um stream)
async function getAudioStreamFromBackend(sessionId, guildId, interaction) {
    // Esta função precisa ser robusta.
    // 1. Chamar o backend /api/bot/connect para validar a sessão e informar que o bot está pronto.
    // 2. Se sucesso, o backend deve prover uma forma de obter o áudio.
    //    Pode ser um WebSocket que o bot se conecta, ou o backend começa a enviar dados.

    try {
        const connectResponse = await fetch(`${BACKEND_API_URL}/bot/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bot-Api-Key': BOT_API_KEY, // Autenticação do bot com o backend
            },
            body: JSON.stringify({
                session_id: sessionId,
                discord_user_id: interaction.user.id,
                guild_id: guildId,
                voice_channel_id: interaction.member.voice.channel.id,
            }),
        });

        if (!connectResponse.ok) {
            const errorData = await connectResponse.json();
            console.error(`[MusicCmd] Falha ao conectar com backend para sessão ${sessionId}:`, errorData);
            await interaction.followUp({ content: `Erro ao conectar com o servidor Nakama: ${errorData.error || 'Erro desconhecido.'}`, ephemeral: true });
            return null;
        }

        const connectData = await connectResponse.json();
        console.log(`[MusicCmd] Conexão com backend para sessão ${sessionId} estabelecida:`, connectData.message);

        // Agora, como obter o áudio?
        // Opção A: Backend retorna um endpoint WebSocket para o bot se conectar.
        // Opção B: Esta chamada /bot/connect já "ativa" o envio de áudio do backend para o bot (menos comum para áudio contínuo).
        // Opção C: O backend expõe uma função (se no mesmo processo, o que não é o caso aqui) ou um mecanismo de pub/sub (Redis).

        // Para este placeholder, vamos assumir que o backend agora sabe para onde enviar o áudio
        // e o bot precisa apenas de um stream local para o AudioPlayer.
        // A lógica de como o backend envia os dados para este bot (ex: via um WebSocket que o bot abre para o backend,
        // ou o backend abre uma conexão para o bot) precisa ser definida.
        
        // Placeholder: Simular um stream que receberia dados do backend.
        // const audioPassThrough = new PassThrough();
        
        // O backend (via fastify.getAudioStreamForSession) precisaria de uma forma de "empurrar" dados para este bot.
        // Isso é complexo entre processos. Uma solução seria o bot abrir um WS para o backend e receber os chunks.
        // fastify.getAudioStreamForSession(sessionId) no backend é um bom começo, mas como o bot o chama e recebe dados?

        // Simplificação para o placeholder:
        // Vamos assumir que o backend tem uma forma de enviar os dados para o bot
        // e o bot os recebe e os coloca em um stream que o AudioPlayer pode consumir.
        // Esta parte é a mais crítica e depende da arquitetura de comunicação backend <-> bot.
        
        // Exemplo: se o backend fosse expor um stream HTTP (não ideal para tempo real, mas para exemplo)
        // const audioResponse = await fetch(`${BACKEND_API_URL}/audio/stream/${sessionId}`);
        // return audioResponse.body; // Retorna um ReadableStream (Node.js stream)
        
        // Por enquanto, retornamos um placeholder que precisa ser conectado à fonte real de áudio.
        // O AudioPlayer espera um Readable, então vamos criar um PassThrough que precisaria ser alimentado.
        // const stream = new PassThrough();
        // console.log(`[MusicCmd] Stream PassThrough criado para sessão ${sessionId}. Aguardando dados do backend...`);
        // TODO: Implementar a lógica de recebimento de dados do backend e escrita no 'stream'.
        // Exemplo: se o bot se conecta a um WebSocket do backend para receber os chunks de áudio:
        // const audioWs = new WebSocket(`${BACKEND_WS_URL}/ws/audio/subscribe/${sessionId}`);
        // audioWs.on('message', (chunk) => stream.write(chunk));
        // audioWs.on('close', () => stream.end());
        // return stream;

        // Para este esqueleto, vamos apenas logar e retornar null, indicando que a lógica de streaming real falta.
        console.log(`[MusicCmd] Lógica de obtenção de stream de áudio para sessão ${sessionId} do backend precisa ser implementada.`);
        await interaction.followUp({ content: `Conectado ao backend, mas a parte de streaming de áudio ainda é um placeholder.`, ephemeral: true });
        return null; // Retornar null até que a lógica de streaming esteja implementada

    } catch (error) {
        console.error(`[MusicCmd] Erro crítico ao tentar obter stream de áudio para ${sessionId}:`, error);
        await interaction.followUp({ content: `Erro crítico ao comunicar com o servidor Nakama. Tente novamente mais tarde.`, ephemeral: true });
        return null;
    }
}


export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Conecta o bot ao seu canal de voz para tocar o áudio da sessão Nakama.')
    .addStringOption(option =>
      option.setName('id_sessao')
        .setDescription('O ID da sua sessão Nakama (visível no dashboard).')
        .setRequired(true)),
  async execute(interaction, client) {
    const sessionId = interaction.options.getString('id_sessao');

    // Verificar se o usuário está em um canal de voz
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'Você precisa estar em um canal de voz para usar este comando!', ephemeral: true });
    }

    // Verificar permissões do bot para conectar e falar
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('CONNECT')) {
      return interaction.reply({ content: 'Não tenho permissão para conectar a este canal de voz!', ephemeral: true });
    }
    if (!permissions.has('SPEAK')) {
      return interaction.reply({ content: 'Não tenho permissão para falar neste canal de voz!', ephemeral: true });
    }

    await interaction.deferReply(); // Adiar a resposta, pois pode levar tempo

    try {
      // 1. Obter o stream de áudio do backend (Placeholder)
      const audioStream = await getAudioStreamFromBackend(sessionId, interaction.guildId, interaction);

      if (!audioStream) {
        // getAudioStreamFromBackend já deve ter enviado uma mensagem de erro.
        // Se não, descomente:
        // await interaction.followUp({ content: `Não foi possível obter o stream de áudio para a sessão ${sessionId}. Verifique o ID ou tente novamente.`, ephemeral: true });
        return;
      }

      // 2. Conectar ao canal de voz
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true, // O bot se ensurdece para não gastar recursos processando seu próprio áudio
      });

      // Lidar com estados da conexão de voz
      connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Parece ser uma desconexão temporária, reconectando...
        } catch (error) {
            // Parece ser uma desconexão real, destruir a conexão.
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            console.log(`[MusicCmd] Conexão de voz para sessão ${sessionId} desconectada e destruída.`);
            // TODO: Notificar o backend que o bot desconectou?
        }
      });
      
      connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log(`[MusicCmd] Conexão de voz para ${sessionId} destruída.`);
        // Limpar player, etc.
        player.stop();
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000); // Esperar até 30s para conectar
      console.log(`[MusicCmd] Conectado ao canal de voz ${voiceChannel.name} para sessão ${sessionId}.`);

      // 3. Criar AudioPlayer e AudioResource
      const player = createAudioPlayer();
      
      // O tipo de stream (Opus, PCM) deve ser conhecido ou negociado com o backend.
      // Para node-portaudio ou ffmpeg, pode ser PCM. Se Opus, melhor ainda.
      const resource = createAudioResource(audioStream, {
        inputType: StreamType.Arbitrary, // Usar StreamType.Opus ou StreamType.Raw (PCM) se souber o formato
        // inlineVolume: true, // Se quiser controlar o volume por usuário (requer processamento)
      });

      player.play(resource);
      await entersState(player, AudioPlayerStatus.Playing, 10_000); // Esperar até 10s para começar a tocar
      console.log(`[MusicCmd] Reprodução iniciada para sessão ${sessionId}.`);

      // 4. Inscrever a conexão de voz no player
      const subscription = connection.subscribe(player);

      // Lidar com o fim da reprodução ou erros
      player.on(AudioPlayerStatus.Idle, () => {
        console.log(`[MusicCmd] Player ficou Idle para sessão ${sessionId}. Stream terminou ou foi interrompido.`);
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy(); // Desconectar do canal de voz
        }
        // O stream de áudio (audioStream) deve ser fechado/finalizado pela fonte (backend ou getAudioStreamFromBackend)
      });

      player.on('error', error => {
        console.error(`[MusicCmd] Erro no AudioPlayer para sessão ${sessionId}:`, error.message);
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
        // Tentar notificar o usuário sobre o erro
        interaction.followUp({ content: `Ocorreu um erro durante a reprodução: ${error.message}`, ephemeral: true }).catch(console.error);
      });
      
      await interaction.followUp({ content: `🎶 Conectado e pronto para tocar o áudio da sessão \`${sessionId}\`!`, ephemeral: false });

      // Manter a interação viva ou fornecer controles (pausar, parar) - Fora do escopo deste placeholder inicial.
      // Ex: coletor de botões para pausar/parar.
      // O bot desconectará quando o stream terminar (player idle) ou se houver erro.

    } catch (error) {
      console.error(`[MusicCmd] Erro geral no comando /music para sessão ${sessionId}:`, error);
      await interaction.followUp({ content: 'Ocorreu um erro inesperado ao tentar tocar o áudio.', ephemeral: true });
      // Tentar limpar conexões se existirem e não foram destruídas
      // (precisaria de acesso à `connection` e `player` aqui, o que pode ser complicado com escopo de try/catch)
    }
  },
};
