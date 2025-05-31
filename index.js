//Importando biblioteca dotenv
require('dotenv').config();

//Importando biblioteca do discord
const { Client, GatewayIntentBits } = require('discord.js');

//Importando id do canal
const ID_CHANNEL = process.env.ID_CHANNEL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

//Evento que verifica se o bot está pronto
client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

//Evento que verifica atualizações em canais de voz
    client.on('voiceStateUpdate', (oldState, newState) => {
        
        //Verificação se um usuário entrou em um canal de voz
        if(!oldState.channel && newState.channel) {
            console.log(`${newState.member.user.tag} entrou no canal de voz ${newState.channel.name}`);
        }

        //Verificação se um usuário saiu de um canal de voz
        else if(oldState.channel && !newState.channel) {
            console.log(`${oldState.member.user.tag} saiu do canal de voz ${oldState.channel.name}`);
        }
    })
    

//Conectando ao bot discord
client.login(process.env.DISCORD_TOKEN);
