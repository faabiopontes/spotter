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
const crash = require("./crash");

http.listen(port, async () => {
  console.log(`Listening on *:${port}`);

  // await roulette.loadLastPages();
  // await crash.loadLastPages();
  // roulette.loadMissingIds();
  // crash.loadMissingIds();
});

app.post("/roulette/insert", async (req, res) => {
  const { id, color, created_at } = req.body;

  await roulette.insert(id, color, created_at);
  res.send("ok");
});

app.post("/crash/insert", async (req, res) => {
  const { id, crash_point, created_at } = req.body;

  await crash.insert(id, crash_point, created_at);
  res.send("ok");
});

setTimeout(async () => {
  const response = await crash.loadRecent();
  console.log({ response });
}, 1000);

setInterval(async () => {
  const response = await crash.loadRecent();
  console.log({ response });
}, 180000);

setTimeout(async () => {
    const response = await roulette.loadRecent();
    console.log({ response });
}, 11000);

setInterval(async () => {
  const response = await roulette.loadRecent();
  console.log({ response });
}, 500000);

app.get("/loadLastPages", async (req, res) => {
  try {
    res.send("Last 10 pages successfully added");
  } catch (err) {
    res.send(err);
  }
});

// app.get("/roulette/loadInterval", async (req, res) => {
//   const { start, end } = req.query;
//   roulette.loadInterval(start, end);
//   res.send(`Inserting roulette records between ${start} and ${end}`);
// });

// app.get("/crash/loadInterval", async (req, res) => {
//   const { start, end } = req.query;
//   crash.loadInterval(start, end);
//   res.send(`Inserting crash records between ${start} and ${end}`);
// });

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
