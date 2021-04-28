const crypto = require("crypto");
const fs = require("fs");
const blaze_api = require("./blaze_api");

const divisible = (hash, mod) => {
  let val = 0;

  let o = hash.length % 4;
  for (let i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
};

const getPoint = (hash) => {
  // In 1 of 15 games the game crashes instantly.
  if (divisible(hash, 15)) return 0;

  // Use the most significant 52-bit from the hash to calculate the crash point
  let h = parseInt(hash.slice(0, 52 / 4), 16);
  let e = Math.pow(2, 52);

  const point = (Math.floor((100 * e - h) / (e - h)) / 100).toFixed(2);

  return point.replace(".", ",");
};

const start = async () => {
  const [firstRecord] = await blaze_api.getCrashHistory();
  const lastServerSeed = firstRecord.server_seed;
  const amount = 3500;
  const chain = [lastServerSeed];

  for (let i = 0; i < amount; i++) {
    chain.push(
      crypto
        .createHash("sha256")
        .update(chain[chain.length - 1])
        .digest("hex")
    );
  }

  // the hash of bitcoin block 570128 (https://medium.com/@blazedev/blaze-com-crash-seeding-event-v2-d774d7aeeaad)
  const clientSeed =
    "0000000000000000000415ebb64b0d51ccee0bb55826e43846e5bea777d91966";

  const crashPoints = chain.map((seed) => {
    const hash = crypto
      .createHmac("sha256", seed)
      .update(clientSeed)
      .digest("hex");

    const point = getPoint(hash);

    return point;
  });

  const fileContent = crashPoints.reverse().join("\n");
  const fileName = "crash_points.csv";

  fs.writeFile(fileName, fileContent, (err) => {
    if (err) {
      return console.error(err);
    }

    console.log(`Last ${amount} Crash Points written to ${fileName}`);
  });
};

start();
