// discord-bot/src/bot.js
import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Carregar variáveis de ambiente (usar dotenv em um projeto real)
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'your_discord_bot_token';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'your_discord_application_client_id'; // Mesmo Client ID do backend OAuth
// const GUILD_ID = process.env.DISCORD_GUILD_ID; // Opcional: para registrar comandos apenas em um servidor (para dev)

const __dirname = dirname(fileURLToPath(import.meta.url));

// Criar um novo cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // Necessário para interagir com canais de voz
    GatewayIntentBits.GuildMessages,    // Se for usar comandos de texto legados (não recomendado)
    GatewayIntentBits.MessageContent,   // Se precisar ler conteúdo de mensagens
  ],
});

// Coleção para armazenar comandos slash
client.commands = new Collection();

// Carregar comandos slash
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commandsToDeploy = [];

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  // Usar import() dinâmico para módulos ES
  const commandModule = await import(filePath);
  const command = commandModule.default || commandModule; // Se exportar como default ou diretamente

  if (command && 'data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsToDeploy.push(command.data.toJSON()); // Adiciona a definição JSON do comando para deploy
    console.log(`[INFO] Comando carregado: ${command.data.name}`);
  } else {
    console.log(`[AVISO] O comando em ${filePath} está faltando a propriedade "data" ou "execute".`);
  }
}

// Registrar comandos slash com o Discord
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
  try {
    console.log(`[INFO] Iniciando o refresh de ${commandsToDeploy.length} comandos (/) da aplicação.`);

    // O método put é usado para dar refresh completo em todos os comandos na guild ou globalmente.
    // Para desenvolvimento, é comum registrar em uma guild específica:
    // await rest.put(
    //   Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    //   { body: commandsToDeploy },
    // );
    // console.log(`[INFO] Comandos (/) da aplicação recarregados com sucesso para a guild ${GUILD_ID}.`);

    // Para produção, registrar globalmente (pode levar até 1 hora para propagar):
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commandsToDeploy },
    );
    console.log('[INFO] Comandos (/) da aplicação recarregados com sucesso globalmente.');

  } catch (error) {
    console.error('[ERRO] Falha ao recarregar comandos da aplicação:', error);
  }
})();


// Carregar eventos (opcional, se houver listeners de eventos específicos)
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const eventModule = await import(filePath);
  const event = eventModule.default || eventModule;

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[INFO] Evento carregado: ${event.name}`);
}


// Evento principal: Interação com Comandos Slash
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return; // Apenas comandos slash de chat

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`[ERRO] Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
    await interaction.reply({ content: 'Erro: Comando não encontrado!', ephemeral: true });
    return;
  }

  try {
    // Passar o cliente para o comando, caso ele precise
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`[ERRO] Erro ao executar o comando ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Ocorreu um erro ao executar este comando!', ephemeral: true });
    }
  }
});

// Evento de "pronto" (quando o bot loga com sucesso)
client.once(Events.ClientReady, c => {
  console.log(`[INFO] Bot Nakama está online! Logado como ${c.user.tag}`);
  client.user.setActivity('seu áudio no PC | /music', { type: 'LISTENING' }); // Exemplo de status
});

// Logar o bot no Discord com o token
if (!BOT_TOKEN) {
  console.error('[ERRO FATAL] Token do bot não fornecido! Verifique suas variáveis de ambiente (DISCORD_BOT_TOKEN).');
  process.exit(1);
}
if (!CLIENT_ID) {
  console.error('[ERRO FATAL] Client ID não fornecido! Verifique suas variáveis de ambiente (DISCORD_CLIENT_ID).');
  process.exit(1);
}

client.login(BOT_TOKEN);

export default client; // Exportar o cliente se necessário em outros módulos (ex: para testes)
