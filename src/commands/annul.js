const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anular')
    .setDescription('Anula um jogo de ranked')
    .addIntegerOption(option =>
      option.setName('game')
        .setDescription('Número do jogo')
        .setRequired(true)
    ),

  async execute(interaction, db, client) {
    const gameNumber = interaction.options.getInteger('game');
    const guild = interaction.guild;

    // Verifica se o jogo existe
    const jogo = await db.getGameByNumber(gameNumber);
    if (!jogo) {
      return interaction.reply({ content: `❌ Jogo #${gameNumber} não encontrado.`, ephemeral: true });
    }

    // ✅ Responde a interação imediatamente
    await interaction.reply({ content: `⏳ Cancelando o jogo #${gameNumber}...`, ephemeral: true });

    // Obtém todos os canais do servidor
    const channels = Array.from(guild.channels.cache.values());

    // Deleta canais do jogo (voz e texto)
    for (const channel of channels) {
      if (!channel) continue;
      if (channel.name.includes(`JOGO #${gameNumber}`) || channel.name === `jogo-${gameNumber}`) {
        try {
          await channel.delete();
          console.log(`Canal ${channel.name} deletado.`);
        } catch (err) {
          console.error(`Erro ao deletar o canal ${channel.name}:`, err);
        }
      }
    }

    // Atualiza o banco de dados: marca como anulado
    await db.setGameWinner(gameNumber, 'anulado');

    // Libera o status de jogo ativo no servidor
    guild.activeGame = false;

    // ⚡ Opcional: enviar confirmação em canal de logs fixo (não no canal do jogo)
    const logChannel = guild.channels.cache.find(c => c.name === 'logs' && c.isText());
    if (logChannel) {
      logChannel.send(`❌ Jogo #${gameNumber} foi **anulado** com sucesso.`);
    }

    // Finaliza log no console
    console.log(`Jogo #${gameNumber} anulado com sucesso.`);
  }
};
