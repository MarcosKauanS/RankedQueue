const { ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  async execute(oldState, newState, client, db, config) {
    const CHANNEL_ID = config.CHANNEL_ID;
    const GUILD_ID = config.GUILD_ID;

    if (!oldState.channel && !newState.channel) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);
    if (!voiceChannel) return;

    const membersInCall = Array.from(voiceChannel.members.values());

    // Log de entrada/saída
    if (!oldState.channel && newState.channel?.id === CHANNEL_ID) {
      console.log(`${newState.member.user.tag} entrou no canal de voz ${voiceChannel.name}`);
    }
    if (oldState.channel?.id === CHANNEL_ID && !newState.channel) {
      console.log(`${oldState.member.user.tag} saiu do canal de voz ${voiceChannel.name}`);
    }

    // Cria o jogo apenas quando houver exatamente 2 membros no canal
    if (membersInCall.length === 2) {
      if (guild.activeGame) return;
      guild.activeGame = true;

      // Embaralha os membros
      for (let i = membersInCall.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [membersInCall[i], membersInCall[j]] = [membersInCall[j], membersInCall[i]];
      }

      const middleIndex = Math.ceil(membersInCall.length / 2);
      const team1 = membersInCall.slice(0, middleIndex);
      const team2 = membersInCall.slice(middleIndex);

      // Salva jogo no banco e obtém o gameNumber
      const gameNumber = await db.addGame(team1, team2);

      // Cria canais de voz
      const voice1 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 1]`,
        type: ChannelType.GuildVoice,
      });
      const voice2 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 2]`,
        type: ChannelType.GuildVoice,
      });

      // Move membros
      for (const member of team1) await member.voice.setChannel(voice1);
      for (const member of team2) await member.voice.setChannel(voice2);

      // Cria canal de texto
      const textChannel = await guild.channels.create({
        name: `jogo-${gameNumber}`,
        type: ChannelType.GuildText,
      });

      // Monta embed
      const embed = new EmbedBuilder()
        .setTitle(`🎮 JOGO #${gameNumber}`)
        .setColor(0x00AE86)
        .addFields(
          { name: '🟦 Time 1', value: team1.map(m => `<@${m.id}>`).join('\n') || 'Nenhum jogador', inline: true },
          { name: '🟥 Time 2', value: team2.map(m => `<@${m.id}>`).join('\n') || 'Nenhum jogador', inline: true }
        )
        .setFooter({ text: 'Boa sorte a todos!' });

      await textChannel.send({ embeds: [embed] });

      console.log(`Jogo #${gameNumber} criado com sucesso!`);

      // Função de cleanup
      const cleanup = async () => {
        const remaining = Array.from(voiceChannel.members.values());
        if (remaining.length === 0) {
          guild.activeGame = false;
          try {
            await voice1.delete();
            await voice2.delete();
            await textChannel.delete();
          } catch (err) {
            console.error('Erro ao deletar canais do jogo:', err);
          }
          client.off('voiceStateUpdate', cleanupListener);
        }
      };

      // Listener único para cleanup
      const cleanupListener = (oldS, newS) => cleanup();
      client.on('voiceStateUpdate', cleanupListener);
    }
  },
};
