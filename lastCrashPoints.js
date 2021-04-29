const crypto = require("crypto");
const fs = require("fs");
const blaze_api = require("./blaze_api");

const start = async () => {
  const [firstRecord] = await blaze_api.getCrashHistory();
  const lastServerSeed = firstRecord.server_seed;
  const amount = 10500;
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
  

  const crashPoints = chain.map((seed) => {
    const hash = crypto
      .createHmac("sha256", seed)
      .update(clientSeed)
      .digest("hex");

    const point = getPoint(hash);

    // TODO: Ajustar para pegar a data do último Crash
    // Ir subtraindo 30 segundos
    // E colocar no CSV tanto a coluna do id incremental
    // Quanto da data no formato ano, mes, dia, hora, minuto, segundo
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
