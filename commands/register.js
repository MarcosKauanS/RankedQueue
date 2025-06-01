const {SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription("Registra você para acessar os canais exclusivos"),
    async execute(interaction) {
        await interaction.reply("Você usou o comando de registro");
    },
};