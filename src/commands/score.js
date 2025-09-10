const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const tiers = require('../config/tiers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pontuar')
    .setDescription('Define o time vencedor de um jogo de ranked')
    .addIntegerOption(option =>
      option.setName('game')
        .setDescription('Número do jogo')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('vencedor')
        .setDescription('Time vencedor')
        .setRequired(true)
        .addChoices(
          { name: 'Time 1', value: 'time1' },
          { name: 'Time 2', value: 'time2' },
        ))
    .addUserOption(option =>
      option.setName('mvp')
        .setDescription('Escolha o jogador MVP do time vencedor')
        .setRequired(false)), // opcional caso ninguém seja MVP

  async execute(interaction, db) {
    // 1️⃣ Verifica permissões/cargo
    const member = interaction.member;
    const scorerRole = member.roles.cache.find(r => r.name === 'Scorer');
    if (!scorerRole && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    }

    // 2️⃣ Defer reply para evitar "Unknown interaction"
    await interaction.deferReply({ ephemeral: true });

    const gameNumber = interaction.options.getInteger('game');
    const vencedor = interaction.options.getString('vencedor');
    const mvpUser = interaction.options.getUser('mvp');

    const jogo = await db.getGameByNumber(gameNumber);
    if (!jogo) return interaction.editReply({ content: `❌ Jogo #${gameNumber} não encontrado.` });

    // Verifica se já foi scorado
    if (jogo.winner) {
      return interaction.editReply({
        content: `⚠️ O jogo #${gameNumber} já possui vencedor registrado: ${jogo.winner === 'time1' ? 'Time 1' : 'Time 2'}.`
      });
    }

    const timeVencedor = vencedor === 'time1' ? jogo.time1 : jogo.time2;
    const timePerdedor = vencedor === 'time1' ? jogo.time2 : jogo.time1;

    if (!Array.isArray(timeVencedor) || !Array.isArray(timePerdedor)) {
      return interaction.editReply({ content: '❌ Erro: os times do jogo estão inválidos.' });
    }

    // Função para atualizar jogador
    const atualizarJogador = async (player, vitoria = false, derrota = false, mvp = false) => {
      if (!player?.id) return;

      const newElo = await db.updatePlayerStats(player.id, { vitoria, derrota, mvp });

      const guildMember = await interaction.guild.members.fetch(player.id).catch(() => null);
      if (!guildMember) return;

      // Atualiza cargo
      const novoTier = db.getTierByElo(newElo);
      const cargoNovo = interaction.guild.roles.cache.find(r => r.name === novoTier);
      if (cargoNovo) {
        const cargosTiers = interaction.guild.roles.cache.filter(r => tiers.map(t => t.name).includes(r.name));
        await guildMember.roles.remove(cargosTiers).catch(() => {});
        await guildMember.roles.add(cargoNovo).catch(() => {});
      }

      // Atualiza nickname
      let newNickname = `[${newElo}] ${guildMember.user.username}`;
      if (newNickname.length > 32) newNickname = newNickname.slice(0, 32);
      if (guildMember.id !== interaction.guild.ownerId) {
        await guildMember.setNickname(newNickname).catch(() => {});
      }
    };

    // Atualiza todos os jogadores
    for (const player of timeVencedor) {
      const isMVP = mvpUser && player.id === mvpUser.id;
      await atualizarJogador(player, true, false, isMVP);
    }
    for (const player of timePerdedor) await atualizarJogador(player, false, true, false);

    // Define vencedor do jogo
    await db.setGameWinner(gameNumber, vencedor);

    // Mensagem final
    await interaction.editReply({
      content: `🏆 Resultado registrado para o jogo #${gameNumber}!\n**Vencedores:** ${timeVencedor.map(p => `<@${p.id}>`).join(', ')}\n**Perdedores:** ${timePerdedor.map(p => `<@${p.id}>`).join(', ')}${mvpUser ? `\n🌟 MVP: <@${mvpUser.id}>` : ''}`
    });

    // Remove canais do jogo após 3 segundos
    setTimeout(async () => {
      try {
        const voice1 = interaction.guild.channels.cache.find(c => c.name === `JOGO #${gameNumber} [Time 1]`);
        const voice2 = interaction.guild.channels.cache.find(c => c.name === `JOGO #${gameNumber} [Time 2]`);
        const textChannel = interaction.guild.channels.cache.find(c => c.name === `jogo-${gameNumber}`);

        if (voice1) await voice1.delete().catch(() => {});
        if (voice2) await voice2.delete().catch(() => {});
        if (textChannel) await textChannel.delete().catch(() => {});

        console.log(`Canais do jogo #${gameNumber} removidos após scoragem.`);
      } catch (err) {
        console.error('Erro ao remover canais do jogo:', err);
      }
    }, 3000);

    // Libera flag para novos jogos
    interaction.guild.activeGame = false;
  }
};
