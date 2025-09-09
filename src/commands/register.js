const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registrar')
    .setDescription("Se registre para acessar canais exclusivos.")
    .addStringOption(option =>
      option.setName('nick')
        .setDescription("Insira aqui o seu nick (opcional).")
        .setRequired(false)
    ),

  async execute(interaction, db) {
    const REGISTER_CHANNEL_ID = process.env.REGISTER_CHANNEL_ID;
    const REGISTER_ROLE_ID = process.env.REGISTER_ROLE_ID;

    // Verifica se está no canal correto
    if (interaction.channel.id !== REGISTER_CHANNEL_ID) return;

    try {
      // Defer para evitar timeout
      await interaction.deferReply({ ephemeral: true });

      const role = interaction.guild.roles.cache.get(REGISTER_ROLE_ID);
      if (!role) return interaction.editReply("Cargo de registro não encontrado.");

      const userId = interaction.member.id;

      // Proteção do dono
      if (userId === interaction.guild.ownerId) {
        return interaction.editReply("Não posso modificar o apelido do dono do servidor.");
      }

      // Checa se já existe no DB
      const existingUser = await db.getUser(userId);
      if (existingUser) return interaction.editReply("Você já está registrado!");

      const username = interaction.options.getString('nick') || interaction.member.user.username;
      const elo = 0;
      let newUsername = `[${elo}] ${username}`;

      if (newUsername.length > 32) newUsername = newUsername.slice(0, 32);

      // Executa operações async em paralelo
      await Promise.all([
        interaction.member.roles.add(role),
        interaction.member.setNickname(newUsername),
        db.addUser(userId, username, elo)
      ]);

      await interaction.editReply("✅ Você foi registrado com sucesso!");
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Ocorreu um erro ao tentar registrar você.");
      } else {
        await interaction.reply({ content: "❌ Ocorreu um erro ao tentar registrar você.", ephemeral: true });
      }
    }
  },
};
