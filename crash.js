const blaze_api = require("./blaze_api");
const db = require("./db");

const crash = {
  lastSavedId: 0,
  loadMissingIds: async () => {
    const missingIdsIntervals = await crash.getMissingIdsIntervals();
    missingIdsIntervals.reverse();

    for (const missingIdsInterval of missingIdsIntervals) {
      const { gap_starts_at, gap_ends_at } = missingIdsInterval;
      await crash.loadInterval(gap_starts_at, gap_ends_at);
    }
  },
  loadInterval: async (start, end) => {
    let crashId;
    for (crashId = end; crashId >= start; crashId--) {
      try {
        const blazeResponse = await blaze_api.getCrashById(crashId);
        const { id, crash_point, created_at } = blazeResponse;
        await crash.insert(id, crash_point, created_at);
      } catch (err) {
        console.error("Error at: crash.loadInterval");
        console.error(err);
      }
    }
  },
  loadLastPages: async () => {
    let inserted = 0;
    let lastSavedId = 0;

    for (let page = 1; page <= 10; page++) {
      const blazeResponse = await blaze_api.getCrashHistory(page);
      let ids = [];

      blazeResponse.forEach((row) => ids.push(row.id));
      const pendingIds = await crash.getPendingIds(ids);
      const pendingHistory = blazeResponse.filter(
        (history) => pendingIds.indexOf(history.id) !== -1
      );

      for (const history of pendingHistory) {
        const { id, crash_point, created_at } = history;
        await crash.insert(id, crash_point, created_at);

        if (lastSavedId == 0) {
          lastSavedId = id;
        }

        inserted++;
      }

      if (pendingHistory.length < 8) {
        break;
      }
    }

    crash.lastSavedId = lastSavedId;

    return inserted;
  },
  getMissingIdsIntervals: async () => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT 
        (t1.id + 1) AS gap_starts_at,
        (
          SELECT MIN(t3.id) - 1
          FROM crash_history t3
          WHERE t3.id > t1.id
        ) AS gap_ends_at
      FROM crash_history t1
      WHERE
        NOT EXISTS (
          SELECT t2.id
          FROM crash_history t2
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
      FROM crash_history
    `);
    const { lastSavedId } = rows[0];

    return lastSavedId;
  },
  getPendingIds: async (ids) => {
    const conn = await db.connect();
    const [rows] = await conn.query(`
      SELECT id
      FROM crash_history
      WHERE id in (${ids.join()})
    `);
    const existingIds = rows.map((row) => row.id);
    const pendingIds = ids.filter((id) => existingIds.indexOf(id) === -1);
    return pendingIds;
  },
  parseCreatedAtToUnixTime: (createdAt) => {
    const date = new Date(createdAt);
    return date.valueOf() / 1000;
  },
  insert: async (id, crash_point, createdAt) => {
    const unixCreatedAt = crash.parseCreatedAtToUnixTime(createdAt);

    const conn = await db.connect();
    await conn.query(
      `
        INSERT INTO crash_history(
          id,
          crash_point,
          created_at
        ) VALUES (
          ?,
          ?,
          FROM_UNIXTIME(?)
        )
      `,
      [id, crash_point, unixCreatedAt]
    );
    console.log(`Inserted (${id}, ${crash_point}, ${unixCreatedAt}) into DB`);
  },
};

module.exports = crash;
