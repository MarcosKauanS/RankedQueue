const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trocarnick')
    .setDescription('Permite que o usuário troque seu nickname')
    .addStringOption(option =>
      option.setName('novo')
        .setDescription('O novo nickname que você quer usar')
        .setRequired(true)
    ),

  async execute(interaction, db) {
    const novoNick = interaction.options.getString('novo').trim().slice(0, 32); // limite de 32 caracteres

    // Pega o membro que executou o comando
    const member = interaction.member;

    // Mantém o padrão de ELO se existir
    const userDb = await db.getUser(member.id);
    const elo = userDb?.elo || 0; 
    const finalNick = `[${elo}] ${novoNick}`;

    try {
      await member.setNickname(finalNick);
      await interaction.reply({ content: `✅ Seu nickname foi atualizado para: ${finalNick}`, ephemeral: true });
    } catch (err) {
      console.error('Erro ao trocar nickname:', err);
      await interaction.reply({ content: '❌ Não foi possível trocar seu nickname.', ephemeral: true });
    }
  }
};