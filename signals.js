const db = require("./db");

const signals = {
  getByName: async (name) => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT id, name, win, loss
      FROM signals
      WHERE name = ?
    `,
    [name]);
    const [row] = rows;

    return row;
  },
  create: async (name) => {
    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO signals(
          name
        ) VALUES (
          ?
        )
      `,
      [name]
    );
  },
  addResult: async (signalId, result) => {
    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO signals_history(
          signal_id,
          result
        ) VALUES (
          ?,
          ?
        )
      `,
      [signalId, result]
    );
    const resultField = result === 'WIN' ? 'win' : 'loss';
    await conn.query(
      `
        UPDATE signals SET 
        ${resultField}=${resultField}+1
        WHERE
          id = ?
      `,
      [signalId]
    );
  }
};

module.exports = signals;
