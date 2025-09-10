// commands/perfil.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Exibe suas estatísticas ou de outro jogador')
    .addUserOption(option =>
      option
        .setName('jogador')
        .setDescription('Escolha um jogador para ver o perfil')
        .setRequired(false)
    ),

  async execute(interaction, db) {
    const target = interaction.options.getUser('jogador') || interaction.user;

    // Pega usuário do banco
    const user = await db.getUser(target.id);

    if (!user) {
      return interaction.reply({ content: 'Usuário não encontrado no banco de dados.', ephemeral: true });
    }

    // Monta embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 Perfil de ${target.username}`)
      .setColor('#FFD700')
      .addFields(
        { name: 'Elo', value: `${user.elo}`, inline: true },
        { name: 'Vitórias', value: `${user.wins}`, inline: true },
        { name: 'Derrotas', value: `${user.losses}`, inline: true },
        { name: 'Jogos Jogados', value: `${user.games_played}`, inline: true },
        { name: 'Streak', value: `${user.streak}`, inline: true },
        { name: 'MVPs', value: `${user.mvps}`, inline: true },
        { name: 'Camas', value: `${user.camas}`, inline: true }
      )
      .setFooter({ text: 'RankedQueue' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
