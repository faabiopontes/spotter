const blaze_api = require("./blaze_api");
const db = require("./db");
const bot = require("./bot");

const crash = {
  lastSavedId: 0,
  lastGames: [],
  start: async () => {
    const crashInterval = process.env.CRASH_INTERVAL || 100000;
    crash.lastGames = await crash.loadLastGamesFromDB(100);

    setInterval(async () => {
      try {
        const response = await crash.loadLastPages();
        if (response.length == 0) {
          return;
        }

        crash.addToLastGames(response);
        crash.checkSignals();

        console.log({ response });
      } catch (err) {
        console.log(`Erro em crash.start`);
        bot.sendMessageAdmin(`Erro em crash.start: ${err.message}`);
        console.log(err);
        setTimeout(async () => {
          const response = await crash.loadLastPages();
          console.log({ response });
        }, 5000);
      }
    }, crashInterval);
  },
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
    let inserted = [];
    let lastSavedId = 0;

    for (let page = 1; page <= 10; page++) {
      const blazeResponse = await blaze_api.getCrashHistory(page);
      let crashHistory = [];

      blazeResponse.forEach((row) => {
        crashHistory.push({ id: row.id, createdAt: row.created_at });
        row.crash_point = blaze_api.getCrashPointFromServerSeed(
          row.server_seed
        );
      });
      const pendingIds = await crash.getPendingIds(crashHistory);
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

        inserted.push(parseFloat(crash_point));
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
  loadLastGamesFromDB: async (limit = 100) => {
    const conn = await db.connect();
    const query = `
      SELECT crash_point
      FROM crash_history
      ORDER BY created_at DESC
      LIMIT 0, ${limit}
    `;
    const [rows] = await conn.query(query);
    return rows.map((row) => parseFloat(row.crash_point));
  },
  addToLastGames: (elements) => {
    elements.reverse().forEach((element) => {
      crash.lastGames.pop();
      crash.lastGames.unshift(element);
    });
    debugger;
  },
  checkSignals: () => {
    crash.isBadWaveEqualOrAbove(3, 3);
  },
  badWave: false,
  isBadWaveEqualOrAbove: (badWaveLength, martingaleLength = 1) => {
    const firstWinIndex = crash.lastGames.findIndex(
      (crashPoint) => crashPoint > 2
    );
    const secondWinIndex = crash.lastGames.findIndex((crashPoint, index) => {
      return crashPoint > 2 && index > firstWinIndex;
    });
    const signalInfo = `<b>Sinal Bronze</b> 🔔 (81% acerto)`;
    console.log({ firstWinIndex, secondWinIndex, badWaveLength });

    if (crash.badWave && firstWinIndex < badWaveLength) {
      crash.badWave = false;
      const crashPoint = crash.lastGames[firstWinIndex];
      const length = secondWinIndex - firstWinIndex - 1;
      const win = badWaveLength + martingaleLength > length;

      if (length < badWaveLength) {
        return bot.sendMessageAdmin(
          "Algo errado não está certo, verificar logs desse horário"
        );
      }

      bot.sendMessage(
        `${signalInfo}\n<b>${
          win ? "WIN ✅" : "LOSS 🔴"
        }</b>\nSequencia de LOSS acabou após ${length} rodadas\nCom Crash Point: <b>${crashPoint}x</b>`
      );
    }

    if (firstWinIndex == badWaveLength) {
      crash.badWave = true;
    }

    if (firstWinIndex == badWaveLength - 1) {
      const crashPoint = crash.lastGames[0];
      const martingaleInfo =
        martingaleLength > 1 ? `(Max ${martingaleLength} Martingale)` : "";

      bot.sendMessage(
        `${signalInfo}\nSe após <b>${crashPoint}x</b> vier <b>LOSS</b> ⚫\nEntrar na próxima ${martingaleInfo}`
      );
    }
  },
  aboveCrashPointInTheLast: (crashPoint, last) => {},
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
    month = month.toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },
  insert: async (id, crash_point, createdAt = null) => {
    const dateTime = crash.parseCreatedAtToDateTime(createdAt);

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
          ?
        )
      `,
      [id, crash_point, dateTime]
    );
    console.log(
      `Inserted crash_history(${id}, ${crash_point}, ${dateTime}) into DB`
    );
  },
};

module.exports = crash;
