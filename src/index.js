// index.js
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const Database = require('./database/Database');
const { registerCommands } = require('./deploy-commands');
const { createRolesIfNotExist } = require('./utils/createRoles');

// Inicializa DB
const db = new Database();

// IDs importantes
const CHANNEL_ID = process.env.CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID;

// Inicializa o client do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Coleção para comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Número do jogo
client.gameNumber = 0;

// ✅ Importa o módulo de voiceStateUpdate
const voiceStateHandler = require('./events/voiceStateUpdate');

// Evento de monitoramento de entrada/saída de voz
client.on('voiceStateUpdate', (oldState, newState) => {
  voiceStateHandler.execute(oldState, newState, client, db, {
    CHANNEL_ID,
    GUILD_ID
  });
});

// Evento de interação com comandos Slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Ocorreu um erro ao executar o comando.', ephemeral: true });
    }
  }
});

// Evento chamado quando o bot estiver pronto
client.once('ready', async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  if (guild) {
    console.log('⏳ Verificando cargos...');
    await createRolesIfNotExist(guild);
  } else {
    console.error('❌ Não foi possível encontrar o servidor.');
  }
});

// Inicialização do bot
(async () => {
  try {
    // Conecta e cria tabelas
    await db.connect();
    await db.createUsersTable();
    await db.createGamesTable();

    // Registra comandos Slash
    await registerCommands();

    // Login do bot
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao iniciar o bot:', error);
  }
})();
