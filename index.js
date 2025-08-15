require('dotenv').config();

const { Client, GatewayIntentBits, Collection, ChannelType, Events} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const {token, prefix} = require('./config/config');
const connection = require('./database/connection')

const CHANNEL_ID = process.env.CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for(const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

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
    const guild = client.guilds.cache.get(GUILD_ID);
    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);

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

client.on('interactionCreate', async interaction => {
  const command = client.commands.get(interaction.commandName);
  
  await command.execute(interaction);
});
    
client.login(process.env.DISCORD_TOKEN);
