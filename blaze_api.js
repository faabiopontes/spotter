const fetch = require("node-fetch");

const blaze_api = {
  parseResponse: async (response) => {
    return response.json();
  },
  getRouletteLastId: async () => {
    const response = await fetch(
      "https://api-v2.blaze.com/roulette_games/recent"
    );
    const [{ id }] = await response.json();
    return id;
  },
  getRouletteRecent: async () => {
    const response = await fetch(
      "https://api-v2.blaze.com/roulette_games/recent"
    );
    return blaze_api.parseResponse(response);
  },
  getRouletteHistory: async (page = 1) => {
    const response = await fetch(
      `https://api-v2.blaze.com/roulette_games/recent/history?page=${page}`
    );
    const json = await blaze_api.parseResponse(response);
    return json.records;
  },
  getRouletteById: async (id) => {
    const response = await fetch(
      `https://api-v2.blaze.com/roulette_games/${id}`
    );
    const json = await blaze_api.parseResponse(response);
    return json;
  },
  getCrashLastId: async () => {
    const response = await fetch("https://api-v2.blaze.com/crash_games/recent");
    const [{ id }] = await response.json();
    return id;
  },
  getCrashRecent: async () => {
    const response = await fetch("https://api-v2.blaze.com/crash_games/recent");
    return blaze_api.parseResponse(response);
  },
  getCrashHistory: async (page = 1) => {
    const response = await fetch(
      `https://api-v2.blaze.com/crash_games/recent/history?page=${page}`
    );
    return blaze_api.parseResponse(response).records;
  },
  getCrashById: async (id) => {
    const response = await fetch(`https://api-v2.blaze.com/crash_games/${id}`);
    const json = await blaze_api.parseResponse(response);
    return json;
  },
};

module.exports = blaze_api;
