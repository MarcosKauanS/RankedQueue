// src/utils/createRoles.js
const tiers = require('../config/tiers');

async function createRolesIfNotExist(guild) {
  try {
    const existingRoles = await guild.roles.fetch();
    const createdRoles = [];

    for (const tier of tiers) {
      const roleExists = existingRoles.find(r => r.name === tier.name);

      if (!roleExists) {
        const newRole = await guild.roles.create({
          name: tier.name,
          color: tier.color,
          reason: `Cargo criado automaticamente para o tier ${tier.name}`
        });

        createdRoles.push(newRole.name);
      }
    }

    if (createdRoles.length > 0) {
      console.log(`✅ Cargos criados: ${createdRoles.join(', ')}`);
    } else {
      console.log('⚡ Todos os cargos já existem. Nada foi criado.');
    }
  } catch (err) {
    console.error('❌ Erro ao criar cargos automaticamente:', err);
  }
}

module.exports = { createRolesIfNotExist };
