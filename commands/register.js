const {SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription("Registra você para acessar os canais exclusivos"),
    async execute(interaction) {
        const REGISTER_CHANNEL_ID = process.env.REGISTER_CHANNEL_ID;
        const REGISTER_ROLE_ID = process.env.REGISTER_ROLE_ID;

        if(interaction.channel.id !== REGISTER_CHANNEL_ID) return;
        
        if(interaction.content == '!registrar') {
            try {
            const role = interaction.guild.roles.cache.get(REGISTER_ROLE_ID);
            const username = interaction.member.user.username;
            const elo = 0;
            const newUsername = `[${elo}]${username}`;

            if(interaction.member.id == interaction.guild.ownerId) {
                return interaction.reply("Não posso modificar o apelido do dono do servidor")
            }

            if(!role) {
                return interaction.reply("Cargo de registro não encontrado");
            
            } else {
                await interaction.member.roles.add(role);

                await interaction.member.setNickname(newUsername);

                await interaction.reply("Você foi registrado");
            }
            }catch(error) {
            console.error(error);
            interaction.reply("Ocorreu um erro ao tentar registrar você")
            }
        }

        await interaction.reply("Você usou o comando de registro");
    },
};