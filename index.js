require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const ID_CHANNEL = process.env.ID_CHANNEL;
const ID_REGISTER_CHANNEL = process.env.ID_REGISTER_CHANNEL;
const ID_REGISTER_ROLE = process.env.ID_REGISTER_ROLE;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

client.on('voiceStateUpdate', (oldState, newState) => {

  if(!oldState.channel && newState.channel) {
    console.log(`${newState.member.user.tag} entrou no canal de voz ${newState.channel.name}`);
  }

  else if(oldState.channel && !newState.channel) {
    console.log(`${oldState.member.user.tag} saiu do canal de voz ${oldState.channel.name}`);
  }
});

client.on('messageCreate', async(message) => {
  if(message.author.bot) return;

  if(message.channel.id !== ID_REGISTER_CHANNEL) return;
  
  if(message.content == '!registrar') {
    try {
      const role = message.guild.roles.cache.get(ID_REGISTER_ROLE);
      const username = message.member.user.username;
      const elo = 0;
      const newUsername = `[${elo}]${username}`;

      if(message.member.id == message.guild.ownerId) {
        return message.reply("Não posso modificar o apelido do dono do servidor")
      }

      if(!role) {
        return message.reply("Cargo de registro não encontrado");
      
      } else {
        await message.member.roles.add(role);

        await message.member.setNickname(newUsername);

        await message.reply("Você foi registrado");
      }
    }catch(error) {
      console.error(error);
      message.reply("Ocorreu um erro ao tentar registrar você")
    }
  }
});
    
client.login(process.env.DISCORD_TOKEN);
