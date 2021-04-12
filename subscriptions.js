const db = require("./db");

const subscriptions = {
  getAll: async () => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT *
      FROM subscriptions
      WHERE id in (${ids.join()})
    `);
    return rows;
  },
  insert: async (subscription) => {
    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO subscriptions(
          subscription,
        ) VALUES (
          ?,
        )
      `,
      [subscription]
    );
    console.log(`Inserted subscription(${subscription}) into DB`);
  },
};

module.exports = subscriptions;
