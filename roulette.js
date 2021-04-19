const blaze_api = require("./blaze_api");
const db = require("./db");

const roulette = {
  lastSavedId: 0,
  loadMissingIds: async () => {
    const missingIdsIntervals = await roulette.getMissingIdsIntervals();
    missingIdsIntervals.reverse();

    for (const missingIdsInterval of missingIdsIntervals) {
      const { gap_starts_at, gap_ends_at } = missingIdsInterval;
      await roulette.loadInterval(gap_starts_at, gap_ends_at);
    }
  },
  loadInterval: async (start, end) => {
    let rouletteId;
    for (rouletteId = end; rouletteId >= start; rouletteId--) {
      try {
        const blazeResponse = await blaze_api.getRouletteById(rouletteId);
        const { id, color, created_at } = blazeResponse;
        await roulette.insert(id, color, created_at);
      } catch (err) {
        console.error("Erro em roulette.loadInterval");
        console.error(err);
      }
    }
  },
  loadRecent: async () => {
    let inserted = 0;
    let lastSavedId = 0;

    const blazeResponse = await blaze_api.getRouletteRecent();
    let ids = [];

    blazeResponse.forEach((row) => ids.push(row.id));
    const pendingIds = await roulette.getPendingIds(ids);
    const pendingRecent = blazeResponse.filter(
      (history) => pendingIds.indexOf(history.id) !== -1
    );

    for (const recent of pendingRecent) {
      const { id, color, created_at } = recent;
      await roulette.insert(id, color, created_at);

      if (lastSavedId == 0) {
        lastSavedId = id;
      }

      inserted++;
    }

    roulette.lastSavedId = lastSavedId;

    return inserted;
  },
  loadLastPages: async () => {
    let inserted = 0;
    let lastSavedId = 0;

    for (let page = 1; page <= 10; page++) {
      const blazeResponse = await blaze_api.getRouletteHistory(page);
      let ids = [];

      blazeResponse.forEach((row) => ids.push(row.id));
      const pendingIds = await roulette.getPendingIds(ids);
      const pendingHistory = blazeResponse.filter(
        (history) => pendingIds.indexOf(history.id) !== -1
      );

      for (const history of pendingHistory) {
        const { id, color, created_at } = history;
        await roulette.insert(id, color, created_at);

        if (lastSavedId == 0) {
          lastSavedId = id;
        }

        inserted++;
      }

      if (pendingHistory.length < 8) {
        break;
      }
    }

    roulette.lastSavedId = lastSavedId;

    return inserted;
  },
  getMissingIdsIntervals: async () => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT 
        (t1.id + 1) AS gap_starts_at,
        (
          SELECT MIN(t3.id) - 1
          FROM roulette_history t3
          WHERE t3.id > t1.id
        ) AS gap_ends_at
      FROM roulette_history t1
      WHERE
        NOT EXISTS (
          SELECT t2.id
          FROM roulette_history t2
          WHERE t2.id = t1.id + 1
        )
      HAVING gap_ends_at IS NOT NULL
    `);

    return rows;
  },
  getLastSavedId: async () => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT MAX(id) as lastSavedId
      FROM roulette_history
    `);
    const { lastSavedId } = rows[0];

    return lastSavedId;
  },
  getPendingIds: async (ids) => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT id
      FROM roulette_history
      WHERE id in ('${ids.join("','")}')
    `);
    const existingIds = rows.map((row) => row.id);
    const pendingIds = ids.filter((id) => existingIds.indexOf(id) === -1);
    return pendingIds;
  },
  parseCreatedAtToUnixTime: (createdAt) => {
    let date;

    if (!createdAt) {
      date = new Date();
    } else {
      date = new Date(createdAt);
    }

    return date.valueOf() / 1000;
  },
  insert: async (id, color, createdAt = null) => {
    const unixCreatedAt = roulette.parseCreatedAtToUnixTime(createdAt);

    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO roulette_history(
          id,
          color,
          created_at
        ) VALUES (
          ?,
          ?,
          FROM_UNIXTIME(?)
        )
      `,
      [id, color, unixCreatedAt]
    );
    console.log(`Inserted roulette_history(${id}, ${color}, ${unixCreatedAt}) into DB`);
  },
};

module.exports = roulette;
