const mysql = require("mysql2/promise");

async function connect() {
  if(global.connection && global.connection.state !== 'disconnected')
    return global.connection;

  const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeout: 60000
  };
  
  const connection = await mysql.createConnection(options);
  console.log("Connected to MySQL");

  connection.on('error', err => {
    console.log(`db: connection error': ${err}`);
    try {
      global.connection.destroy();
    } catch (destroyErr) {
      console.log(`db: error destroying connection: ${destroyErr}`);
    } finally {
      global.connection = undefined;
    }
  });

  global.connection = connection;
  return connection;
}

module.exports = { connect };