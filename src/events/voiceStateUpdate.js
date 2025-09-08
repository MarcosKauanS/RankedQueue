const { ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  async execute(oldState, newState, client, db, config) {
    const CHANNEL_ID = config.CHANNEL_ID;
    const GUILD_ID = config.GUILD_ID;

    // Ignora se não mudou de canal
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

    // Quando houver exatamente 2 membros, cria o jogo
    if (membersInCall.length === 2) {
      // Embaralha os membros
      for (let i = membersInCall.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [membersInCall[i], membersInCall[j]] = [membersInCall[j], membersInCall[i]];
      }

      const middleIndex = Math.ceil(membersInCall.length / 2);
      const team1 = membersInCall.slice(0, middleIndex);
      const team2 = membersInCall.slice(middleIndex);

      // Número do jogo
      if (!client.gameNumber) client.gameNumber = 1;
      else client.gameNumber++;
      const gameNumber = client.gameNumber;

      // Cria canais de voz para cada time
      const voice1 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 1]`,
        type: ChannelType.GuildVoice
      });
      const voice2 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 2]`,
        type: ChannelType.GuildVoice
      });

      // Move os membros para os canais de voz correspondentes
      for (const member of team1) await member.voice.setChannel(voice1);
      for (const member of team2) await member.voice.setChannel(voice2);

      // Cria canal de texto
      const textChannel = await guild.channels.create({
        name: `jogo-${gameNumber}`,
        type: ChannelType.GuildText
      });

      // Monta o embed bonitinho
      const embed = new EmbedBuilder()
        .setTitle(`🎮 JOGO #${gameNumber}`)
        .setColor(0x00AE86)
        .addFields(
          { name: '🟦 Time 1', value: team1.map(m => `<@${m.id}>`).join('\n') || 'Nenhum jogador', inline: true },
          { name: '🟥 Time 2', value: team2.map(m => `<@${m.id}>`).join('\n') || 'Nenhum jogador', inline: true }
        )
        .setFooter({ text: 'Boa sorte a todos!' });

      // Envia o embed no canal de texto
      await textChannel.send({ embeds: [embed] });

      // Salva usuários no DB (se quiser)
      await Promise.all(team1.map(m => db.addUser(m.id, m.user.username)));
      await Promise.all(team2.map(m => db.addUser(m.id, m.user.username)));

      console.log(`Jogo #${gameNumber} criado com sucesso!`);
    }
  }
};
