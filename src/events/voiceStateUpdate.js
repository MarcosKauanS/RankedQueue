const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  async execute(oldState, newState, client, db, config) {
    const CHANNEL_ID = config.CHANNEL_ID;
    const GUILD_ID = config.GUILD_ID;

    // Ignora mudanças irrelevantes
    if (!oldState.channel && !newState.channel) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);
    if (!voiceChannel) return;

    const membersInCall = Array.from(voiceChannel.members.values());

    // Logs de entrada/saída
    if (!oldState.channel && newState.channel?.id === CHANNEL_ID) {
      console.log(`${newState.member.user.tag} entrou no canal de voz ${voiceChannel.name}`);
    }
    if (oldState.channel?.id === CHANNEL_ID && !newState.channel) {
      console.log(`${oldState.member.user.tag} saiu do canal de voz ${voiceChannel.name}`);
    }

    // Cria o jogo apenas quando houver exatamente 2 membros e não houver jogo ativo
    if (membersInCall.length === 2 && !guild.activeGame) {
      guild.activeGame = true;

      // Embaralha os membros
      for (let i = membersInCall.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [membersInCall[i], membersInCall[j]] = [membersInCall[j], membersInCall[i]];
      }

      const middleIndex = Math.ceil(membersInCall.length / 2);
      const team1 = membersInCall.slice(0, middleIndex);
      const team2 = membersInCall.slice(middleIndex);

      // Salva jogadores no banco caso não existam
      for (const member of [...team1, ...team2]) {
        await db.addUser(member.id, member.user.username);
      }

      // Salva jogo no banco e obtém gameNumber
      const gameNumber = await db.addGame(
        team1.map(m => ({ id: m.id, username: m.user.username })),
        team2.map(m => ({ id: m.id, username: m.user.username }))
      );

      const everyoneRole = guild.roles.everyone;

      // Cria canal de voz Time 1
      const voice1 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 1]`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          { 
            id: everyoneRole.id, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            deny: [PermissionFlagsBits.Speak] // todos podem entrar, mas não falar
          },
          ...team1.map(m => ({
            id: m.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] // membros do time podem falar
          }))
        ]
      });

      // Cria canal de voz Time 2
      const voice2 = await guild.channels.create({
        name: `JOGO #${gameNumber} [Time 2]`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          { 
            id: everyoneRole.id, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            deny: [PermissionFlagsBits.Speak]
          },
          ...team2.map(m => ({
            id: m.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
          }))
        ]
      });

      // Move membros para os canais
      for (const member of team1) await member.voice.setChannel(voice1);
      for (const member of team2) await member.voice.setChannel(voice2);

      // Cria canal de texto apenas para membros do jogo
      const textChannel = await guild.channels.create({
        name: `jogo-${gameNumber}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ...[...team1, ...team2].map(m => ({
            id: m.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
          }))
        ]
      });

      // Monta embed
      const embed = new EmbedBuilder()
        .setTitle(`🎮 JOGO #${gameNumber}`)
        .setColor(0x00AE86)
        .addFields(
          { name: '🟦 Time 1', value: team1.map(m => `<@${m.id}>`).join('\n'), inline: true },
          { name: '🟥 Time 2', value: team2.map(m => `<@${m.id}>`).join('\n'), inline: true }
        )
        .setFooter({ text: 'Boa sorte a todos!' });

      await textChannel.send({ embeds: [embed] });

      console.log(`Jogo #${gameNumber} criado com sucesso!`);
    }
  },
};
