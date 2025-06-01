require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const CHANNEL_ID = process.env.CHANNEL_ID;
const REGISTER_CHANNEL_ID = process.env.REGISTER_CHANNEL_ID;
const REGISTER_ROLE_ID = process.env.REGISTER_ROLE_ID;
const GUILD_ID = process.env.GUILD_ID
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
    GatewayIntentBits.GuildMembers
  ],
});

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

let memberCall = 0;
let gameNumber = 0

client.on('voiceStateUpdate', (oldState, newState) => {

  
  if(!oldState.channel && newState.channel) {
    console.log(`${newState.member.user.tag} entrou no canal de voz ${newState.channel.name}`);
    memberCall += 1;
    console.log(memberCall);
  }

  else if(oldState.channel && !newState.channel) {
    console.log(`${oldState.member.user.tag} saiu do canal de voz ${oldState.channel.name}`);
    if(memberCall < 0 ) {
      memberCall = 0;
      console.log(memberCall);
    }else {
     memberCall -= 1;
     console.log(memberCall);
    }
  }

  if(memberCall == 2) {
    const guild = client.guilds.cache.get(ID_GUILD);
    const voiceChannel = guild.channels.cache.get(ID_CHANNEL);

    const membersInCall = Array.from(voiceChannel.members.values());

    for (let i = membersInCall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [membersInCall[i], membersInCall[j]] = [membersInCall[j], membersInCall[i]];
    }

    const middleIndex = Math.ceil(membersInCall.length / 2);
    const team1 = membersInCall.slice(0, middleIndex);
    const team2 = membersInCall.slice(middleIndex);

    const team1Mentions = team1.map(member => `<@${member.id}>`).join(' ');
    const team2Mentions = team2.map(member => `<@${member.id}>`).join(' ');

    gameNumber += 1;

    guild.channels.create( {
      name: `JOGO #${gameNumber}`, 
      type: ChannelType.GuildText
    }).then(channel => {
      channel.send(`${team1Mentions}`);
      channel.send(`${team2Mentions}`);
    });

    guild.channels.create({
      name: `JOGO #${gameNumber} [Time 1]`,
      type: ChannelType.GuildVoice
    });

    guild.channels.create({
      name: `JOGO #${gameNumber} [Time 2]`,
      type: ChannelType.GuildVoice
    });

    memberCall = 0;
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
