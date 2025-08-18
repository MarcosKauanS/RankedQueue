// database/Database.js

/**
 * Classe Database - Gerencia a conexão e operações com o MySQL
 */
const mysql = require('mysql2/promise');
const { mysql: dbConfig } = require('../config/config');

class Database {
  constructor() {
    this.connection = null; // Armazena a conexão com o banco
  }

  /**
   * Conecta ao MySQL usando as configurações definidas
   * Encerra o processo em caso de erro
   */
  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('Conectado ao MySQL com sucesso!');
    } catch (err) {
      console.error('Erro ao conectar ao MySQL:', err);
      process.exit(1);
    }
  }

  /**
   * Cria a tabela 'users' se ainda não existir
   * Contém colunas para armazenar informações de perfil do usuário
   */
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.query(query);
    console.log('Tabela "users" criada ou já existe!');
  }

  // Futuro: adicionar métodos para manipular usuários
  // ex: addUser(discordId, username), getUser(discordId), updateElo(discordId, newElo)

  async addUser(discordId, Username, elo  = 0) {
    const query = 'INSERT INTO users (discord_id, username, elo) VALUES (?, ?, ?)';

    await this.connection.execute(query, [discordId, Username, elo]);
  }

  async getUser(discordId) {
    const [rows] = await this.connection.execute(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId]
    );
    return rows[0];
  }
}

module.exports = Database;
