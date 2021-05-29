const crypto = require("crypto");
const fs = require("fs");
const blaze_api = require('./blaze_api');

const TILES = [
  { number: 0, color: "white" },
  { number: 11, color: "black" },
  { number: 5, color: "red" },
  { number: 10, color: "black" },
  { number: 6, color: "red" },
  { number: 9, color: "black" },
  { number: 7, color: "red" },
  { number: 8, color: "black" },
  { number: 1, color: "red" },
  { number: 14, color: "black" },
  { number: 2, color: "red" },
  { number: 13, color: "black" },
  { number: 3, color: "red" },
  { number: 12, color: "black" },
  { number: 4, color: "red" },
];

const start = async () => {
  const [firstRecord] = await blaze_api.getRouletteHistory();
  const lastServerSeed = firstRecord.server_seed;
  const amount = 3000;
  const chain = [lastServerSeed];

  for (let i = 0; i < amount; i++) {
    chain.push(
      crypto
        .createHash("sha256")
        .update(chain[chain.length - 1])
        .digest("hex")
    );
  }

  // the hash of bitcoin block 570120 (https://medium.com/@blazedev/blaze-com-double-seeding-event-d3290ef13454)
  const clientSeed =
    "0000000000000000002aeb06364afc13b3c4d52767e8c91db8cdb39d8f71e8dd";

  const doubleMapped = chain.reverse().map((seed, index) => {
    const hash = crypto
      .createHmac("sha256", seed)
      .update(clientSeed)
      .digest("hex");

    // roulette number from 0-15
    const n = parseInt(hash, 16) % 15;

    const tile = TILES.find((t) => t.number === n);

    return `${index + 1};${tile.color}`;
  });
  const fileContent = doubleMapped.join("\n");
  const fileName = "double_spins.csv";

  fs.writeFile(fileName, fileContent, (err) => {
    if (err) {
      return console.error(err);
    }

    console.log(`Last ${amount} Double rounds written to ${fileName}`);
  });
};

start();