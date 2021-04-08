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

  await roulette.loadLastPages();
  await crash.loadLastPages();
  roulette.loadMissingIds();
  crash.loadMissingIds();
});

setInterval(async () => {
  try {
    const inserted = await roulette.loadLastPages();
    if (inserted > 0) {
      console.log(`setInterval:roulette: Inserted records: ${inserted}`);
    }
  } catch (err) {
    console.error("Error at roulette setInterval");
    console.log(err);
  }
}, 10000);

setInterval(async () => {
  try {
    const inserted = await crash.loadLastPages();
    if (inserted > 0) {
      console.log(`setInterval:crash: Inserted records: ${inserted}`);
    }
  } catch (err) {
    console.error("Error at crash setInterval");
    console.log(err);
  }
}, 5001);

app.get("/loadLastPages", async (req, res) => {
  try {
    res.send("Last 10 pages successfully added");
  } catch (err) {
    res.send(err);
  }
});

app.get("/roulette/loadInterval", async (req, res) => {
  const { start, end } = req.query;
  roulette.loadInterval(start, end);
  res.send(`Inserting records between ${start} and ${end}`);
});

app.get("/crash/loadInterval", async (req, res) => {
  const { start, end } = req.query;
  crash.loadInterval(start, end);
  res.send(`Inserting records between ${start} and ${end}`);
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
