const { SlashCommandBuilder } = require('discord.js');

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

    // Atualiza stats de cada jogador
    for (const player of timeVencedor) {
      await db.updatePlayerStats(player.id, { vitoria: true, eloChange: 25 }); // +25 de Elo
    }
    for (const player of timePerdedor) {
      await db.updatePlayerStats(player.id, { derrota: true, eloChange: -25 }); // -25 de Elo
    }

    await db.setGameWinner(gameNumber, vencedor);

    await interaction.reply({
      content: `🏆 Resultado registrado para o jogo #${gameNumber}!\n**Vencedores:** ${timeVencedor.map(p => `<@${p.id}>`).join(', ')}\n**Perdedores:** ${timePerdedor.map(p => `<@${p.id}>`).join(', ')}`
    });
  }
};
