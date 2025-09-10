// commands/strike.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strike')
        .setDescription('Pede a anulação de uma partida. Cada jogador tem 3 strikes por temporada.')
        .addUserOption(option =>
            option.setName('jogador')
                .setDescription('Administrador pode aplicar strike em outro jogador')
                .setRequired(false)
        ),

    async execute(interaction, db, config) {
        await interaction.deferReply({ ephemeral: true }); // Defer para evitar múltiplos replies

        const userId = interaction.user.id;
        const guild = interaction.guild;
        const targetUser = interaction.options.getUser('jogador');

        let strikeTargetId;
        let strikeTargetName;

        const member = await guild.members.fetch(userId);
        const isAdmin = member.permissions.has('Administrator');

        if (targetUser) {
            if (!isAdmin) {
                return interaction.editReply({ content: '❌ Apenas administradores podem dar strike em outro jogador.' });
            }
            strikeTargetId = targetUser.id;
            strikeTargetName = targetUser.username;
        } else {
            strikeTargetId = userId;
            strikeTargetName = interaction.user.username;
        }

        // Verifica se usuário existe no banco
        let user = await db.getUser(strikeTargetId);
        if (!user) {
            await db.addUser(strikeTargetId, strikeTargetName);
            user = await db.getUser(strikeTargetId);
        }

        // Verifica se já foi dado strike neste jogo
        const activeGame = guild.activeGameData; // armazenado no guild
        if (activeGame && !isAdmin) {
            activeGame.strikes = activeGame.strikes || [];
            if (activeGame.strikes.includes(strikeTargetId)) {
                return interaction.editReply({ content: '❌ Você já deu strike neste jogo.' });
            }
            activeGame.strikes.push(strikeTargetId);
        }

        // Verifica se jogador já está banido
        if (user.strikes >= 3) {
            return interaction.editReply({ content: '❌ Este jogador já atingiu 3 strikes e não pode mais jogar nesta temporada.' });
        }

        // Adiciona 1 strike
        const newStrikes = user.strikes + 1;
        await db.connection.execute('UPDATE users SET strikes = ? WHERE discord_id = ?', [newStrikes, strikeTargetId]);

        // Se atingir 3 strikes, adiciona cargo Ranked BAN
        if (newStrikes >= 3) {
            const banRole = guild.roles.cache.find(r => r.name === 'Ranked BAN (Strike)') ||
                await guild.roles.create({
                    name: 'Ranked BAN (Strike)',
                    color: Colors.DarkRed,
                    reason: 'Jogador atingiu 3 strikes na temporada'
                });
            const targetMember = await guild.members.fetch(strikeTargetId);
            await targetMember.roles.add(banRole);
        }

        // Mensagem final para o usuário e para o canal do jogo
        const strikeMessage = newStrikes >= 3
            ? `⚠️ ${strikeTargetName} atingiu 3 strikes! Está banido de jogar nesta temporada e recebeu o cargo Ranked BAN (Strike).`
            : `⚠️ ${strikeTargetName} deu strike nesta partida! (${newStrikes}/3 strikes)`;

        // Responde ao comando
        await interaction.editReply({ content: strikeMessage });

        // Envia no canal do jogo, se existir
        if (activeGame && activeGame.textChannelId) {
            try {
                const textChannel = await guild.channels.fetch(activeGame.textChannelId);
                if (textChannel) await textChannel.send({ content: strikeMessage });
            } catch (err) {
                console.error('Erro ao enviar mensagem de strike no canal do jogo:', err);
            }
        }
    }
};
