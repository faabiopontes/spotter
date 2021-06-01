const blaze_api = require("./blaze_api");
const db = require("./db");
const bot = require("./bot");
const signals = require("./signals");

const crash = {
  lastSavedId: 0,
  lastGames: [],
  tick: async () => {
    const response = await crash.loadLastPages();

    if (response.length) {
      crash.tock(response);
    }
  },
  tock: async (response) => {
    crash.addToLastGames(response);
    crash.checkSignals();

    console.log({ response, responseLength: response.length });
  },
  spot: async (response) => {
    console.log("spot");
    console.log({ response });
  },
  start: async () => {
    const crashInterval = process.env.CRASH_INTERVAL || 100000;
    crash.lastGames = await crash.loadLastGamesFromDB(100);

    setInterval(async () => {
      try {
        await crash.tick();
      } catch (err) {
        console.log(`Erro em crash.start`);
        bot.sendMessageAdmin(`Erro em crash.start: ${err.message}`);
        console.log(err);
        setTimeout(async () => {
          await crash.tick();
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
  loadFromSpot: async (spotResponse) => {
    const [firstRow] = spotResponse;
    if (firstRow.id !== crash.lastSavedId) {
      crash.lastSavedId = firstRow.id;
      return crash.loadHistory(spotResponse);
    }
  },
  loadHistory: async (blazeResponse) => {
    let inserted = [];

    let crashHistory = [];
    blazeResponse.forEach((row) => {
      crashHistory.push({ id: row.id, createdAt: row.created_at });
      row.crash_point = blaze_api.getCrashPointFromServerSeed(row.server_seed);
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

      inserted.push({
        id,
        crashPoint: parseFloat(crash_point),
      });
    }
    return inserted;
  },
  loadLastPages: async () => {
    let inserted = [];

    for (let page = 1; page <= 10; page++) {
      const blazeResponse = await blaze_api.getCrashHistory(page);

      const pendingHistory = await crash.loadHistory(blazeResponse);

      if (page == 1) {
        const [firstRow] = blazeResponse;
        crash.lastSavedId = firstRow.id;
        inserted = pendingHistory;
      }

      if (pendingHistory.length < 8) {
        break;
      }
    }

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
      SELECT
        id,
        crash_point
      FROM crash_history
      ORDER BY created_at DESC
      LIMIT 0, ${limit}
    `;
    const [rows] = await conn.query(query);
    return rows.map(({ id, crash_point }) => ({
      id,
      crashPoint: parseFloat(crash_point),
    }));
  },
  addToLastGames: (elements) => {
    elements.reverse().forEach((element) => {
      crash.lastGames.pop();
      crash.lastGames.unshift(element);
    });
  },
  /**
   * BRONZE - BRONZE - B
   * PRATA - SILVER - S
   * OURO - GOLD - G
   * PLATINA - PLATINUM - P
   * DIAMANTE - DIAMOND - D
   */
  checkSignals: () => {
    crash.isBadWaveEqualOrAbove(3, 2, 2, "B");
    crash.crashAboveFollowedByBelowThan(2, 1.13, 5, 4, "G");
  },
  signals: {},
  isBadWaveEqualOrAbove: async (
    badWaveLength,
    martingaleLength,
    minCrashPoint,
    signalType
  ) => {
    const name = `${crash.isBadWaveEqualOrAbove.name}-${badWaveLength}-${martingaleLength}-${minCrashPoint}-${signalType}`;
    if (typeof crash.signals[name] === "undefined") {
      crash.signals[name] = await signals.fetch(name);
      crash.signals[name].badWave = false;
    }
    const signal = crash.signals[name];
    const emoji = signals.getEmojiFromType(signalType);

    const firstWinIndex = crash.lastGames.findIndex(
      (game) => game.crashPoint >= minCrashPoint
    );
    const secondWinIndex = crash.lastGames.findIndex((game, index) => {
      return game.crashPoint >= minCrashPoint && index > firstWinIndex;
    });
    let winRate;
    if (signal.win != 0) {
      let { win, loss } = signal;
      winRate = ((win / (win + loss)) * 100).toFixed(2);
    } else if (signal.loss != 0) {
      winRate = 0;
    }
    winRate = winRate ? `(${winRate}% acerto)` : "";
    console.log({
      firstWinIndex,
      secondWinIndex,
      badWaveLength,
      badWave: signal.badWave,
    });

    if (signal.badWave && firstWinIndex < badWaveLength) {
      signal.badWave = false;
      const crashPoint = crash.lastGames[firstWinIndex].crashPoint;
      const length = secondWinIndex - firstWinIndex - 1;
      const win = badWaveLength + martingaleLength >= length;
      const winAt = length - badWaveLength + 1;
      const lastResult = win ? "WIN" : "LOSS";
      const resultInfo = `${lastResult} ${win ? "✅" : "🔴"}`;

      console.log({
        badWaveLength,
        martingaleLength,
        length,
        winAt,
      });

      if (length < badWaveLength) {
        return bot.sendMessageAdmin(
          "Algo errado não está certo, verificar logs desse horário"
        );
      }

      const message = `${emoji} - <b>${resultInfo}</b> ${winRate}\nSequencia acabou após <b>${length}</b> rodadas\nCrash Point: <b>${crashPoint}x</b>`;

      bot.sendMessage(message);

      if (signal.lastResult === "LOSS") {
        bot.sendMessageRodris(message);
      }

      let sequence;
      if (signal.lastResult == lastResult) {
        sequence = signal.sequence + 1;
      } else {
        signal.lastResult = lastResult;
        sequence = 1;
      }

      signal.sequence = sequence;

      await signals.addResult(
        signal.id,
        lastResult,
        sequence,
        crashPoint,
        winAt
      );
      if (win) {
        signal.win++;
      } else {
        signal.loss++;
      }
    }

    if (firstWinIndex >= badWaveLength) {
      signal.badWave = true;
    }

    if (firstWinIndex == badWaveLength - 1) {
      const lastCrashPoint = crash.lastGames[0].crashPoint;
      const crashPoint = lastCrashPoint > 0 ? lastCrashPoint : 1;
      const martingaleInfo =
        martingaleLength > 1 ? `(Max ${martingaleLength} Martingale)` : "";
      const autoWithdrawInfo = `Auto-retirar: ${minCrashPoint - 0.01}`;
      const message = `${emoji} - Se após <b>${crashPoint}x</b> vier <b>abaixo</b> de <b>${minCrashPoint}x</b>\nEntrar na próxima ${martingaleInfo}\n${autoWithdrawInfo} ${winRate}`;

      bot.sendMessage(message);

      if (signal.lastResult === "LOSS") {
        bot.sendMessageRodris(message);
      }
    }
  },
  crashAboveFollowedByBelowThan: async (
    crashAbove,
    crashBelow,
    minCrashPoint,
    entries,
    signalType
  ) => {
    const name = `${crash.crashAboveFollowedByBelowThan.name}-${crashAbove}-${crashBelow}-${minCrashPoint}-${entries}-${signalType}`;
    if (typeof crash.signals[name] === "undefined") {
      crash.signals[name] = await signals.fetch(name);
      crash.signals[name].triggered = false;
      crash.signals[name].triggerId = "";
      crash.signals[name].emoji = signals.getEmojiFromType(signalType);
    }
    const signal = crash.signals[name];

    if (signal.triggered) {
      const triggerIndex = crash.lastGames.findIndex(
        (game) => game.id == signal.triggerId
      );
      const firstIndexAbove = crash.lastGames.findIndex(
        (game) => game.crashPoint > minCrashPoint
      );
      console.log({
        signal,
        triggerIndex,
        firstIndexAbove,
      });

      if (triggerIndex < entries && firstIndexAbove > triggerIndex) {
        return signal;
      }

      const win = firstIndexAbove < triggerIndex;
      const lastResult = win ? "WIN" : "LOSS";
      const winAt = win ? triggerIndex - firstIndexAbove : -1;
      const resultInfo = `${lastResult} ${win ? "✅" : "🔴"}`;

      // TODO: signals.getWinRate(signal.id);
      // START
      let winRate;
      if (signal.win != 0) {
        let { win, loss } = signal;
        winRate = ((win / (win + loss)) * 100).toFixed(2);
      } else if (signal.loss != 0) {
        winRate = 0;
      }
      winRate = winRate ? `(${winRate}% acerto)` : "";
      // return winRate
      // END

      let msgCrashPoint = 1;
      if (lastResult === "LOSS") {
        for (let i = 0; i < entries; i++) {
          const crashPoint = crash.lastGames[i].crashPoint;
          if (crashPoint > msgCrashPoint) {
            msgCrashPoint = crashPoint;
          }
        }
      } else {
        msgCrashPoint = crash.lastGames[firstIndexAbove].crashPoint;
      }

      const { emoji } = signal;
      const message = `${emoji} - <b>${resultInfo}</b> ${winRate}\nCrash Point: <b>${msgCrashPoint}x</b>`;
      bot.sendMessageVIP(message);

      // TODO: signals.addResult(signal.id, lastResult, (signal.id);
      // START
      let sequence;
      if (signal.lastResult == lastResult) {
        sequence = signal.sequence + 1;
      } else {
        signal.lastResult = lastResult;
        sequence = 1;
      }

      signal.sequence = sequence;

      await signals.addResult(
        signal.id,
        lastResult,
        sequence,
        msgCrashPoint,
        winAt
      );
      if (win) {
        signal.win++;
      } else {
        signal.loss++;
      }

      signal.triggerId = "";
      signal.triggered = false;
      // return signal
      // END
    }

    if (!signal.triggered) {
      const firstIndexBelow = crash.lastGames.findIndex(
        (game) => game.crashPoint < crashBelow
      );
      const firstIndexAbove = crash.lastGames.findIndex(
        (game) => game.crashPoint > crashAbove
      );
      const belowBeforeAfter = firstIndexBelow < firstIndexAbove;
      const diffLesserThanThree = firstIndexAbove - firstIndexBelow < 3;
      const belowIsFirstOrSecond = firstIndexBelow < 2;
      console.log({
        triggered: signal.triggered,
        firstIndexBelow,
        firstIndexAbove,
        belowBeforeAfter,
        diffLesserThanThree,
        belowIsFirstOrSecond,
      });

      if (belowIsFirstOrSecond && diffLesserThanThree && belowBeforeAfter) {
        const firstBelow = crash.lastGames[firstIndexBelow];
        signal.triggered = true;
        signal.triggerId = firstBelow.id;

        const lastCrashPoint = firstBelow.crashPoint;
        const crashPoint = lastCrashPoint > 0 ? lastCrashPoint : 1;
        const martingaleInfo = entries > 1 ? `(Max ${entries} entradas)` : "";
        const autoWithdrawInfo = `Auto-retirar: ${minCrashPoint - 0.01}`;
        const { emoji } = signal;
        const message = `${emoji} - Entrada boa após <b>${crashPoint}x</b> para pegar um <b>${minCrashPoint}x</b>\n${martingaleInfo}\n${autoWithdrawInfo}`;

        bot.sendMessageVIP(message);

        return signal;
      }
    }
  },
  sequenceOfWithoutCrashPointIn: (sequenceOf, minCrashPoint, WinIn) => {},
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
    try {
      const [rows] = await conn.query(query);
      const existingIds = rows.map((row) => row.id);
      const pendingIds = history.filter(
        ({ id }) => existingIds.indexOf(id) === -1
      );
      return pendingIds.map((pending) => pending.id);
    } catch (err) {
      bot.sendMessageAdmin(`crash.getPendingIds error: ${err.message}`);
      await db.reconnect();
      throw new Error(err.message);
    }
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
    await conn.execute(
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
