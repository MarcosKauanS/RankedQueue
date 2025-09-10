// database/Database.js
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('../config/config');
const tiers = require('../config/tiers');

// Função auxiliar para atualizar cargo no Discord
async function updateDiscordRole(client, guildId, discordId, elo) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(discordId);

  // Pega o maior tier cujo elo seja menor ou igual ao elo atual
  let playerTier = tiers[0];
  for (const tier of tiers) {
    if (elo >= tier.elo) playerTier = tier;
    else break;
  }

  // Remove cargos antigos
  const tierNames = tiers.map(t => t.name);
  const rolesToRemove = member.roles.cache.filter(r => tierNames.includes(r.name));
  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove);
  }

  // Adiciona cargo novo
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

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('Conectado ao MySQL com sucesso!');
    } catch (err) {
      console.error('Erro ao conectar ao MySQL:', err);
      process.exit(1);
    }
  }

  async createUsersTable() {
    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      discord_id VARCHAR(30) NOT NULL UNIQUE,
      username VARCHAR(100) NOT NULL,
      elo INT DEFAULT 0,
      daily_elo INT DEFAULT 0,
      wins INT DEFAULT 0,
      losses INT DEFAULT 0,
      games_played INT DEFAULT 0,
      streak INT DEFAULT 0,
      mvps INT DEFAULT 0,
      camas INT DEFAULT 0,
      strikes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await this.connection.query(query);
    console.log('Tabela "users" criada ou já existe!');
  }


  async addUser(discordId, username, elo = 0) {
    const query = 'INSERT IGNORE INTO users (discord_id, username, elo) VALUES (?, ?, ?)';
    await this.connection.execute(query, [discordId, username, elo]);
  }

  async getUser(discordId) {
    const [rows] = await this.connection.execute(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId]
    );
    return rows[0];
  }

  async updatePlayerStats(discordId, { vitoria = false, mvp = false, derrota = false }, client = null, guildId = null) {
    const user = await this.getUser(discordId);
    if (!user) return 0;

    // Pega o tier atual
    const currentTierName = this.getTierByElo(user.elo);
    const tierObj = tiers.find(t => t.name === currentTierName);

    let eloChange = 0;
    if (vitoria) eloChange += tierObj.eloWin;
    if (mvp) eloChange += tierObj.eloMVP;
    if (derrota) eloChange -= tierObj.eloLoss;

    const newElo = Math.max(user.elo + eloChange, 0);
    const wins = vitoria ? user.wins + 1 : user.wins;
    const losses = derrota ? user.losses + 1 : user.losses;
    const games_played = user.games_played + 1;
    const mvps = mvp ? user.mvps + 1 : user.mvps;

    await this.connection.execute(
      'UPDATE users SET elo = ?, wins = ?, losses = ?, games_played = ?, mvps = ? WHERE discord_id = ?',
      [newElo, wins, losses, games_played, mvps, discordId]
    );

    if (client && guildId) {
      await updateDiscordRole(client, guildId, discordId, newElo);
    }

    return newElo;
  }

  async createGamesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        time1 JSON NOT NULL,
        time2 JSON NOT NULL,
        winner VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.query(query);
    console.log('Tabela "games" criada ou já existe!');
  }

  async addGame(time1, time2) {
    const query = 'INSERT INTO games (time1, time2) VALUES (?, ?)';
    const [result] = await this.connection.execute(query, [JSON.stringify(time1), JSON.stringify(time2)]);
    return result.insertId;
  }

  async getGameByNumber(gameNumber) {
    const [rows] = await this.connection.execute(
      'SELECT * FROM games WHERE id = ?',
      [gameNumber]
    );
    if (!rows[0]) return null;

    const parseJSONSafe = (data) => {
      if (!data) return [];
      return typeof data === 'string' ? JSON.parse(data) : data;
    };

    return {
      id: rows[0].id,
      game_number: rows[0].id,
      time1: parseJSONSafe(rows[0].time1),
      time2: parseJSONSafe(rows[0].time2),
      winner: rows[0].winner
    };
  }

  async setGameWinner(gameNumber, winner) {
    await this.connection.execute(
      'UPDATE games SET winner = ? WHERE id = ?',
      [winner, gameNumber]
    );
  }

  getTierByElo(elo) {
    const sorted = [...tiers].sort((a, b) => a.elo - b.elo);
    let tier = sorted[0];
    for (const t of sorted) {
      if (elo >= t.elo) tier = t;
      else break;
    }
    return tier.name;
  }

  /**
   * Retorna todos os jogadores registrados, ordenados pelo Elo (decrescente).
   */
  async getAllPlayersSortedByElo() {
    const [rows] = await this.connection.execute(
      'SELECT discord_id, username, elo FROM users ORDER BY elo DESC'
    );
    return rows;
  }
}

module.exports = Database;
