const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Mostra o ranking de jogadores por Elo, com paginação'),

  async execute(interaction, db) {
    await interaction.deferReply();

    // --- Buscar jogadores no banco ---
    const allPlayers = await db.getAllPlayersSortedByElo();
    if (!allPlayers || allPlayers.length === 0) {
      return interaction.editReply('❌ Nenhum jogador registrado ainda.');
    }

    const pageSize = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(allPlayers.length / pageSize);

    // --- Descobrir posição do usuário que executou o comando ---
    const userId = interaction.user.id;
    const userPosition = allPlayers.findIndex(p => p.discord_id === userId) + 1;

    // Função que gera o Embed para a página atual
    const generateEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const playersPage = allPlayers.slice(start, end);

      const description = playersPage
        .map((player, index) => {
          const rank = start + index + 1;

          // Medalhas para top 3
          let medal;
          medal = `**${rank}º**`;

          return `${medal} • **${player.username}** » \`${player.elo}\``;
        })
        .join('\n');

      return new EmbedBuilder()
        .setTitle('🏆・ARanked - Ranking: Elo')
        .setDescription(
          `🪐 • Rank atualiza em **tempo real**\n\n${description}\n\n` +
          (userPosition > 0
            ? `🏅 » **Sua posição:** ${userPosition}º`
            : '🏅 » Você ainda não está no ranking!')
        )
        .setColor('#FFD700')
        .setFooter({
          text: `ARanked Bed Wars • Página: ${page + 1}/${totalPages}`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
    };

    // Cria os botões de navegação
    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅️ Anterior')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Próximo ➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    };

    // Envia a primeira página
    const message = await interaction.editReply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)]
    });

    // --- Criar coletor para ouvir cliques nos botões ---
    const collector = message.createMessageComponentCollector({
      time: 60_000 // 1 minuto
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: '❌ Apenas quem usou o comando pode navegar.',
          ephemeral: true
        });
      }

      if (btnInteraction.customId === 'prev' && currentPage > 0) {
        currentPage--;
      } else if (btnInteraction.customId === 'next' && currentPage < totalPages - 1) {
        currentPage++;
      }

      await btnInteraction.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)]
      });
    });

    collector.on('end', async () => {
      // Desabilitar botões ao terminar o tempo
      await message.edit({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('⬅️ Anterior')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Próximo ➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          )
        ]
      });
    });
  }
};