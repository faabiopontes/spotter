const nodeFetch = require("node-fetch");
const crypto = require("crypto");

const blaze_api = {
  crashClientSeed:
    "0000000000000000000415ebb64b0d51ccee0bb55826e43846e5bea777d91966",
  hostDNS: "api-v2.blaze.com",
  hostIPv6: "http://[2606:4700:10::6816:2e77]/",
  fetch: async (url) => {
    return nodeFetch(`${blaze_api.hostIPv6}${url}`, {
      headers: { Host: blaze_api.hostDNS },
    });
  },
  parseResponse: async (response) => {
    const text = await response.text();
    let json = {};

    try {
      json = JSON.parse(text);
      // VERIFICAR SE TEM RECORDS OU NÃO
      // PARSEAR A DATA AQUI MESMO
    } catch (err) {
      console.error(err);
      console.error(text);
    }

    return json;
  },
  getCrashPointFromServerSeed: (serverSeed) => {
    const hash = crypto
      .createHmac("sha256", serverSeed)
      .update(blaze_api.crashClientSeed)
      .digest("hex");
    const point = blaze_api.getPoint(hash);
    return point;
  },
  getRouletteLastId: async () => {
    const response = await blaze_api.fetch("roulette_games/recent");
    const [{ id }] = await blaze_api.parseResponse(response);
    return id;
  },
  getRouletteRecent: async () => {
    const response = await blaze_api.fetch("roulette_games/recent");
    const json = await blaze_api.parseResponse(response);
    return json;
  },
  getRouletteHistory: async (page = 1) => {
    const response = await fetch(`roulette_games/recent/history?page=${page}`);
    const json = await blaze_api.parseResponse(response);
    return json.records;
  },
  getRouletteById: async (id) => {
    const response = await blaze_api.fetch(`roulette_games/${id}`);
    const [json] = await blaze_api.parseResponse(response);
    return json;
  },
  getCrashLastId: async () => {
    const response = await blaze_api.fetch("crash_games/recent");
    const [{ id }] = await blaze_api.parseResponse(response);
    return id;
  },
  getCrashRecent: async () => {
    const response = await blaze_api.fetch("crash_games/recent");
    const json = await blaze_api.parseResponse(response);
    return json;
  },
  getCrashHistory: async (page = 1) => {
    const response = await blaze_api.fetch(
      `crash_games/recent/history?page=${page}`
    );
    const json = await blaze_api.parseResponse(response);
    return json.records;
  },
  getCrashById: async (id) => {
    const response = await blaze_api.fetch(`crash_games/${id}`);
    return blaze_api.parseResponse(response);
  },
  divisible: (hash, mod) => {
    let val = 0;

    let o = hash.length % 4;
    for (let i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
      val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
    }

    return val === 0;
  },
  getPoint: (hash) => {
    if (blaze_api.divisible(hash, 15)) return 0;

    let h = parseInt(hash.slice(0, 52 / 4), 16);
    let e = Math.pow(2, 52);

    const point = (Math.floor((100 * e - h) / (e - h)) / 100).toFixed(2);

    return point;
  },
};

module.exports = blaze_api;
