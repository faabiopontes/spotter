import crypto from "crypto";

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

const server_seed =
  "d3fb08dc40e3e8a50f4d9c0367f12338746c60092d584c91c17ed1b80e8d46d9";
const amount = 3000;

const chain = [this.state.server_seed];

for (let i = 0; i < this.state.amount; i++) {
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

const doubleMapped = chain.map((seed, index) => {
  const hash = crypto
    .createHmac("sha256", seed)
    .update(clientSeed)
    .digest("hex");

  // roulette number from 0-15
  const n = parseInt(hash, 16) % 15;

  const tile = TILES.find((t) => t.number === n);

  return tile;
});
