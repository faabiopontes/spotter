if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env" });
}

const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const fetch = require("node-fetch");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/pusher", (req, res) => {
  res.sendFile(__dirname + "/pusher/index.html");
});

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

const port = process.env.PORT || 3000;
const roulette = require("./roulette");

http.listen(port, async () => {
  console.log(`listening on *:${port}`);

  await roulette.loadLastPages();
  roulette.loadMissingIds();
});

setInterval(async () => {
  const inserted = await roulette.loadLastPages();
  if (inserted > 0) {
    console.log(`setInterval: Registros inseridos: ${inserted}`);
  }
}, 10000);

app.get("/loadLastPages", async (req, res) => {
  try {
    res.send("Últimas 10 páginas inseridas com sucesso");
  } catch (err) {
    res.send(err);
  }
});

app.get("/loadInterval", async (req, res) => {
  const { start, end } = req.query;
  await roulette.loadInterval();
});

// let counter = 0;
// let id = 2646043;

// setInterval(async () => {
//   id--;
//   const response = await fetch('https://api-v2.blaze.com/crash_games/recent');
//   const json = await response.json();

//   io.emit('crash_games', json);
// }, 10000);

// setInterval(() => {
//   counter++;

//   io.emit("counter", counter);
// }, 1000);
