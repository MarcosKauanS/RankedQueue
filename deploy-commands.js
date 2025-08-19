require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

// IDs do bot e do servidor (guild)
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Caminho da pasta de comandos
const commandsPath = path.join(__dirname, 'commands');

// Filtra apenas arquivos .js na pasta de comandos
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Array para armazenar os comandos formatados para a API
const commands = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // Garante que o comando possui 'data' e 'execute'
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  }
}

// Inicializa o REST client do Discord
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

/**
 * Função responsável por registrar/atualizar os comandos Slash no servidor.
 * Caso seja necessário, pode ser chamada diretamente do index.js.
 */
async function registerCommands() {
  try {
    console.log('Atualizando comandos Slash...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Comandos Slash atualizados com sucesso!');
  } catch (err) {
    console.error('Erro ao registrar comandos Slash:', err);
  }
}

// Exporta a função para ser utilizada em outros arquivos
module.exports = { registerCommands };
