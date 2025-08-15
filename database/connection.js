const mysql = require('mysql2');
const {mysql: dbConfig} = require('../config/config');

const connection = mysql.createConnection(dbConfig);

connection.connect(err => {
    if(err) {
        console.error("Erro ao conectar ao Mysql:", err);
        return;
    }
    console.log("Conectado ao Mysql com sucesso!");
});

module.exports = connection;