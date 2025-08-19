require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, ChannelType } = require('discord.js');
const Database = require('./database/Database');
const { registerCommands } = require('./deploy-commands');

const db = new Database();

// IDs importantes do servidor
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

// Coleção para armazenar comandos
client.commands = new Collection();

// Carrega os arquivos de comando
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Evento disparado quando o bot está pronto
client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

// Variáveis de controle de jogos
let memberCall = 0;
let gameNumber = 0;

// Evento de monitoramento de entrada e saída em canais de voz
client.on('voiceStateUpdate', (oldState, newState) => {
  // Entrada em canal de voz
  if (!oldState.channel && newState.channel) {
    console.log(`${newState.member.user.tag} entrou no canal de voz ${newState.channel.name}`);
    memberCall++;
    console.log(memberCall);
  } 
  // Saída do canal de voz
  else if (oldState.channel && !newState.channel) {
    console.log(`${oldState.member.user.tag} saiu do canal de voz ${oldState.channel.name}`);
    memberCall = Math.max(memberCall - 1, 0);
    console.log(memberCall);
  }

  // Quando dois membros estiverem no canal, cria os jogos
  if (memberCall === 2) {
    const guild = client.guilds.cache.get(GUILD_ID);
    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);

    const membersInCall = Array.from(voiceChannel.members.values());

    // Embaralha os membros aleatoriamente
    for (let i = membersInCall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [membersInCall[i], membersInCall[j]] = [membersInCall[j], membersInCall[i]];
    }

    // Divide em times
    const middleIndex = Math.ceil(membersInCall.length / 2);
    const team1 = membersInCall.slice(0, middleIndex);
    const team2 = membersInCall.slice(middleIndex);

    const team1Mentions = team1.map(member => `<@${member.id}>`).join(' ');
    const team2Mentions = team2.map(member => `<@${member.id}>`).join(' ');

    gameNumber++;

    // Cria canal de texto para o jogo e envia menções
    guild.channels.create({ name: `JOGO #${gameNumber}`, type: ChannelType.GuildText })
      .then(channel => {
        channel.send(`${team1Mentions}`);
        channel.send(`${team2Mentions}`);
      });

    // Cria canais de voz para cada time
    guild.channels.create({ name: `JOGO #${gameNumber} [Time 1]`, type: ChannelType.GuildVoice });
    guild.channels.create({ name: `JOGO #${gameNumber} [Time 2]`, type: ChannelType.GuildVoice });

    memberCall = 0;
  }
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

// Função principal de inicialização
(async () => {
  // Conecta ao banco e garante que a tabela exista
  await db.connect();
  await db.createUsersTable();

  // Registra os comandos Slash
  await registerCommands();

  // Login do bot
  client.login(process.env.DISCORD_TOKEN);
})();
