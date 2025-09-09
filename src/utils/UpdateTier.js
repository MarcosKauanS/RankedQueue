const tiers = require('../config/tiers');

async function updateDiscordRole(client, guildId, discordId, elo) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(discordId);

  // Determina o tier com base no elo
  let playerTier = tiers[tiers.length - 1]; // último é o maior
  for (const tier of tiers) {
    if (elo < tier.elo) break;
    playerTier = tier;
  }

  // Remove cargos antigos
  const tierNames = tiers.map(t => t.name);
  const rolesToRemove = member.roles.cache.filter(r => tierNames.includes(r.name));
  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove);
  }

  // Adiciona cargo do tier atual
  let role = guild.roles.cache.find(r => r.name === playerTier.name);
  if (!role) {
    role = await guild.roles.create({
      name: playerTier.name,
      color: playerTier.color || 'DEFAULT',
      reason: 'Cargo de tier do RankedQueue',
    });
  }
  await member.roles.add(role);

  console.log(`🔄 ${member.user.tag} atualizado para o tier ${playerTier.name}`);
}

module.exports = { updateDiscordRole };