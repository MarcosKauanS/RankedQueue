require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || '!',
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'rankedqueue',
        port: process.env.MYSQL_PORT || 3307
    }
};
