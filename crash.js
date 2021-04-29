const blaze_api = require("./blaze_api");
const db = require("./db");
const bot = require("./bot");

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
  loadRecent: async () => {
    let inserted = 0;
    let lastSavedId = 0;

    const blazeResponse = await blaze_api.getCrashRecent();
    let ids = [];

    blazeResponse.forEach((row) => ids.push(row.id));
    const pendingIds = await crash.getPendingIds(ids);
    const pendingRecent = blazeResponse.filter(
      (history) => pendingIds.indexOf(history.id) !== -1
    );

    for (const recent of pendingRecent) {
      const { id, crash_point, created_at } = recent;

      try {
        await crash.insert(id, crash_point, created_at);
      } catch (err) {
        console.log("Error at crash.loadRecent");
        console.log(err);
      }

      if (lastSavedId == 0) {
        lastSavedId = id;
      }

      inserted++;
    }

    crash.lastSavedId = lastSavedId;

    return inserted;
  },
  loadLastPages: async () => {
    let inserted = 0;
    let lastSavedId = 0;

    for (let page = 1; page <= 1; page++) {
      const blazeResponse = await blaze_api.getCrashHistory(page);
      let crasHistory = [];

      blazeResponse.forEach((row) => {
        crasHistory.push({ id: row.id, createdAt: row.created_at });
        row.crash_point = blaze_api.getCrashPointFromServerSeed(
          row.server_seed
        );
      });
      const pendingIds = await crash.getPendingIds(crasHistory);
      const pendingHistory = blazeResponse.filter(
        (history) => pendingIds.indexOf(history.id) !== -1
      );

      for (const history of pendingHistory) {
        const { id, crash_point, created_at } = history;

        try {
          await crash.insert(id, crash_point, created_at);
        } catch (err) {
          console.log("Error at crash.loadRecent");
          console.log(err);
        }

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
  getPendingIds: async (history) => {
    const parsedCreatedAts = history.map(({ createdAt }) => {
      const dateTime = crash.parseCreatedAtToDateTime(createdAt);
      return dateTime;
    });
    const conn = await db.connect();
    const query = `
      SELECT id
      FROM crash_history
      WHERE created_at in ('${parsedCreatedAts.join("','")}')
    `;
    const [rows] = await conn.query(query);
    const existingIds = rows.map((row) => row.id);
    const pendingIds = history.filter(
      ({ id }) => existingIds.indexOf(id) === -1
    );
    return pendingIds.map((pending) => pending.id);
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
  parseCreatedAtToDateTime: (createdAt) => {
    let date;

    if (!createdAt) {
      date = new Date();
    } else {
      date = new Date(createdAt);
    }
    const year = date.getFullYear();
    let month = date.getMonth();
    month++;
    month = month.toString().padStart(2, '0');
    const day = date.getDay().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
  insert: async (id, crash_point, createdAt = null) => {
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
    console.log(
      `Inserted crash_history(${id}, ${crash_point}, ${unixCreatedAt}) into DB`
    );
  },
};

module.exports = crash;
