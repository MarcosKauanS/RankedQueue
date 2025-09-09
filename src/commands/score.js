const { SlashCommandBuilder } = require('discord.js');
const tiers = require('../config/tiers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scorar')
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
        )),

  async execute(interaction, db) {
    const gameNumber = interaction.options.getInteger('game');
    const vencedor = interaction.options.getString('vencedor');

    const jogo = await db.getGameByNumber(gameNumber);
    if (!jogo) return interaction.reply({ content: `Jogo #${gameNumber} não encontrado.`, ephemeral: true });

    const timeVencedor = vencedor === 'time1' ? jogo.time1 : jogo.time2;
    const timePerdedor = vencedor === 'time1' ? jogo.time2 : jogo.time1;

    if (!Array.isArray(timeVencedor) || !Array.isArray(timePerdedor)) {
      return interaction.reply({ content: 'Erro: os times do jogo estão inválidos.', ephemeral: true });
    }

    const atualizarJogador = async (player, vitoria = false, derrota = false, mvp = false) => {
      if (!player?.id) return; // Garante que existe ID
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
    for (const player of timeVencedor) await atualizarJogador(player, true, false, player.mvp || false);
    for (const player of timePerdedor) await atualizarJogador(player, false, true, false);

    // Define vencedor do jogo
    await db.setGameWinner(gameNumber, vencedor);

    // Resposta
    await interaction.reply({
      content: `🏆 Resultado registrado para o jogo #${gameNumber}!\n**Vencedores:** ${timeVencedor.map(p => `<@${p.id}>`).join(', ')}\n**Perdedores:** ${timePerdedor.map(p => `<@${p.id}>`).join(', ')}`
    });
  }
};
