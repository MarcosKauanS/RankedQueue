// database/Database.js
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('../config/config');
const tiers = require('../tiers'); // importa a tabela de tiers

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
        elo INT DEFAULT 1000,
        daily_elo INT DEFAULT 0,
        wins INT DEFAULT 0,
        losses INT DEFAULT 0,
        games_played INT DEFAULT 0,
        streak INT DEFAULT 0,
        mvps INT DEFAULT 0,
        camas INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.query(query);
    console.log('Tabela "users" criada ou já existe!');
  }

  async addUser(discordId, username, elo = 1000) {
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

  /**
   * Atualiza os stats do jogador com base em vitória, derrota e MVP
   * Calcula o ELO de acordo com o tier atual
   * Retorna o novo elo
   */
  async updatePlayerStats(discordId, { vitoria = false, mvp = false, derrota = false }) {
    const user = await this.getUser(discordId);
    if (!user) return;

    // Determina o tier atual com base no ELO
    let currentTier = tiers[0];
    for (const tier of tiers) {
      if (user.elo >= tier.eloWin) currentTier = tier;
      else break;
    }

    // Calcula ELO
    let eloChange = 0;
    if (vitoria) eloChange += currentTier.eloWin;
    if (mvp) eloChange += currentTier.eloMVP;
    if (derrota) eloChange -= currentTier.eloLoss;

    const newElo = Math.max(user.elo + eloChange, 0);
    const wins = vitoria ? user.wins + 1 : user.wins;
    const losses = derrota ? user.losses + 1 : user.losses;
    const games_played = user.games_played + 1;
    const mvps = mvp ? user.mvps + 1 : user.mvps;

    await this.connection.execute(
      'UPDATE users SET elo = ?, wins = ?, losses = ?, games_played = ?, mvps = ? WHERE discord_id = ?',
      [newElo, wins, losses, games_played, mvps, discordId]
    );

    return newElo;
  }

  // Tabela de jogos
  async createGamesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_number INT NOT NULL UNIQUE,
        time1 JSON NOT NULL,
        time2 JSON NOT NULL,
        winner VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.query(query);
    console.log('Tabela "games" criada ou já existe!');
  }

  async addGame(gameNumber, time1, time2) {
    const query = 'INSERT INTO games (game_number, time1, time2) VALUES (?, ?, ?)';
    await this.connection.execute(query, [gameNumber, JSON.stringify(time1), JSON.stringify(time2)]);
  }

  async getGameByNumber(gameNumber) {
    const [rows] = await this.connection.execute(
      'SELECT * FROM games WHERE game_number = ?',
      [gameNumber]
    );
    if (!rows[0]) return null;

    const parseJSONSafe = (data) => {
      if (!data) return [];
      return typeof data === 'string' ? JSON.parse(data) : data;
    };

    return {
      id: rows[0].id,
      game_number: rows[0].game_number,
      time1: parseJSONSafe(rows[0].time1),
      time2: parseJSONSafe(rows[0].time2),
      winner: rows[0].winner
    };
  }

  async setGameWinner(gameNumber, winner) {
    await this.connection.execute(
      'UPDATE games SET winner = ? WHERE game_number = ?',
      [winner, gameNumber]
    );
  }

  /**
   * Retorna o tier do jogador baseado no ELO atual
   */
  getTierByElo(elo) {
    let tier = tiers[0];
    for (const t of tiers) {
      if (elo >= t.eloWin) tier = t;
      else break;
    }
    return tier.name;
  }
}

module.exports = Database;
