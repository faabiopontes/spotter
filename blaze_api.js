const fetch = require("node-fetch");

const blaze_api = {
  parseResponse: async (response) => {
    const text = await response.text();
    let json = {};

    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error(err);
      console.error(text);
    }

    return json;
  },
  getRouletteLastId: async () => {
    const response = await fetch(
      "https://api-v2.blaze.com/roulette_games/recent"
    );
    const [{ id }] = await blaze_api.parseResponse(response);
    return id;
  },
  getRouletteRecent: async () => {
    const response = await fetch(
      "https://api-v2.blaze.com/roulette_games/recent"
    );
    const json = await blaze_api.parseResponse(response);
    return json;
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
    const [json] = await blaze_api.parseResponse(response);
    return json;
  },
  getCrashLastId: async () => {
    const response = await fetch("https://api-v2.blaze.com/crash_games/recent");
    const [{ id }] = await blaze_api.parseResponse(response);
    return id;
  },
  getCrashRecent: async () => {
    const response = await fetch("https://api-v2.blaze.com/crash_games/recent");
    const json = await blaze_api.parseResponse(response);
    return json;
  },
  getCrashHistory: async (page = 1) => {
    const response = await fetch(
      `https://api-v2.blaze.com/crash_games/recent/history?page=${page}`
    );
    const json = await blaze_api.parseResponse(response);
    return json.records;
  },
  getCrashById: async (id) => {
    const response = await fetch(`https://api-v2.blaze.com/crash_games/${id}`);
    return blaze_api.parseResponse(response);
  },
};

module.exports = blaze_api;
