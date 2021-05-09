const fetch = require("node-fetch");
const blaze_api = require('./blaze_api');

const spot = {
  sendLastPagesToServer: async () => {
    console.log('sendLastPagesToServer');
    const blazeResponse = await blaze_api.getCrashHistory();
    const crashSpot = await fetch('https://localhost:5000/crash/spot', {
        method: 'post',
        body:    JSON.stringify(blazeResponse),
        headers: { 'Content-Type': 'application/json' },
    });
    console.log({ blazeResponse, crashSpot });
  },
};

module.exports = spot;
