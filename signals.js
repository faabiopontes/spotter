const db = require("./db");

const signals = {
  fetch: async (name) => {
    let signal = await signals.getByName(name);

    if (typeof signal !== "undefined") {
      const lastResult = await signals.getLastResult(signal.id);
      signal.lastResult = lastResult ? lastResult.result : undefined;
      signal.sequence = lastResult ? lastResult.sequence : undefined;

      return signal;
    }

    await signals.create(name);
    return await signals.getByName(name);
  },
  getEmojiFromType: (letter) => {
    switch (letter) {
      case "P":
        return "🔭";
      case "B":
        return "🔔";
      case "S":
        return "🥈";
      case "G":
        return "🥇";
      default:
        return "🔔";
    }
  },
  getByName: async (name) => {
    const conn = await db.connect();
    const [rows] = await conn.query(
      `
      SELECT id, name, win, loss
      FROM signals
      WHERE name = ?
      LIMIT 0, 1
    `,
      [name]
    );
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
  addResult: async (signalId, result, sequence, crashPoint, winAt) => {
    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO signals_history(
          signal_id,
          result,
          sequence,
          crash_point,
          win_at
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [signalId, result, sequence, crashPoint, winAt]
    );
    const resultField = result === "WIN" ? "win" : "loss";
    await conn.query(
      `
        UPDATE signals SET 
        ${resultField}=${resultField}+1
        WHERE
          id = ?
      `,
      [signalId]
    );
  },
  getLastResult: async (signalId) => {
    const conn = await db.connect();
    const [rows] = await conn.query(
      `
        SELECT
          result,
          crash_point,
          sequence,
          win_at
        FROM
          signals_history
        WHERE signal_id = ?
        ORDER BY id DESC
        LIMIT 0, 1
      `,
      [signalId]
    );
    const [row] = rows;

    return row;
  },
};

module.exports = signals;
