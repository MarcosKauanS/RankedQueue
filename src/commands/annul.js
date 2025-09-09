const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anular')
    .setDescription('Anula um jogo de ranked')
    .addIntegerOption(option =>
      option.setName('game')
        .setDescription('Número do jogo')
        .setRequired(true)),

  async execute(interaction, db, client) {
    const gameNumber = interaction.options.getInteger('game');
    const jogo = await db.getGameByNumber(gameNumber);

    if (!jogo) {
      return interaction.reply({ content: `Jogo #${gameNumber} não encontrado.`, ephemeral: true });
    }

    // Tenta remover canais criados
    const guild = interaction.guild;

    // Remover canais de voz
    for (const channel of guild.channels.cache.values()) {
      if (channel.name.includes(`JOGO #${gameNumber}`) || channel.name === `jogo-${gameNumber}`) {
        try {
          await channel.delete();
        } catch (err) {
          console.error(`Erro ao deletar o canal ${channel.name}:`, err);
        }
      }
    }

    // Atualiza banco de dados
    await db.setGameWinner(gameNumber, null); // ou marque como 'anulado' se preferir

    await interaction.reply({ content: `❌ Jogo #${gameNumber} foi anulado com sucesso.` });
  }
};