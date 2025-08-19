const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Estrutura do comando Slash
  data: new SlashCommandBuilder()
    .setName('registrar')
    .setDescription("Se registre para acessar canais exclusivos.")
    .addStringOption(option =>
      option.setName('nick')
        .setDescription("Insira aqui o seu nick (opcional).")
        .setRequired(false) // Não obrigatório, se não fornecer usará o nome do usuário
    ),

  /**
   * Função que executa o comando
   * @param {CommandInteraction} interaction - Interação do usuário
   * @param {Database} db - Instância da classe de banco de dados
   */
  async execute(interaction, db) {
    const REGISTER_CHANNEL_ID = process.env.REGISTER_CHANNEL_ID;
    const REGISTER_ROLE_ID = process.env.REGISTER_ROLE_ID;

    // Verifica se o comando está sendo usado no canal correto
    if (interaction.channel.id !== REGISTER_CHANNEL_ID) return;

    try {
      // Obtém o cargo e define o nickname
      const role = interaction.guild.roles.cache.get(REGISTER_ROLE_ID);
      const username = interaction.options.getString('nick') || interaction.member.user.username;
      const elo = 0;
      let newUsername = `[${elo}] ${username}`;

      // Garante que o nickname não ultrapasse o limite de 32 caracteres do Discord
      if (newUsername.length > 32) {
        newUsername = newUsername.slice(0, 32);
      }

      const userId = interaction.member.id;

      // Proteção: não permite alterar o nickname do dono do servidor
      if (interaction.member.id === interaction.guild.ownerId) {
        return interaction.reply("❌ Não posso modificar o apelido do dono do servidor.");
      }

      // Verifica se o usuário já está registrado no banco
      const existingUser = await db.getUser(userId);
      if (existingUser) {
        return interaction.reply("⚠️ Você já está registrado!");
      }

      // Verifica se o cargo existe
      if (!role) {
        return interaction.reply("❌ Cargo de registro não encontrado.");
      }

      // Adiciona o cargo, define nickname e salva no banco
      await interaction.member.roles.add(role);
      await interaction.member.setNickname(newUsername);
      await db.addUser(userId, username, elo);

      // Confirmação para o usuário
      await interaction.reply("✅ Você foi registrado com sucesso!");

    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      await interaction.reply("❌ Ocorreu um erro ao tentar registrar você.");
    }
  },
};
