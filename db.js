async function connect() {
  if(global.connection && global.connection.state !== 'disconnected')
    return global.connection;
  
  const mysql = require("mysql2/promise");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  console.log("Connected to MySQL");

  global.connection = connection;
  return connection;
}

module.exports = { connect };