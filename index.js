if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env" });
}

const express = require("express");
const webPush = require("web-push");
const path = require("path");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(express.static(path.join(__dirname, "assets")));

app.get("/", (req, res) => {
  if ((req.headers["x-forwarded-proto"] || "").endsWith("http")) {
    res.redirect(`https://${req.headers.host}${req.url}`);
  } else {
    res.sendFile(__dirname + "/index.html");
  }
});

app.get("/pusher", (req, res) => {
  res.sendFile(__dirname + "/pusher/index.html");
});

app.get("/play/:id", (req, res) => {
  const { id } = req.params;
  io.emit('play', id);
  res.send(`Played Id: ${id}`)
});

io.on("connection", (socket) => {
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });
});

const port = process.env.PORT || 3000;
const roulette = require("./roulette");
const crash = require("./crash");
const subscriptions = require("./subscriptions");

http.listen(port, async () => {
  console.log(`Listening on *:${port}`);

  // await roulette.loadLastPages();
  // await crash.loadLastPages();
  // roulette.loadMissingIds();
  // crash.loadMissingIds();
});

const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails(
  "mailto:test@example.com",
  publicVapidKey,
  privateVapidKey
);

app.post("/subscribe", async (req, res) => {
  const subscription = req.body;
  const stringSubscription = JSON.stringify(subscription);

  res.status(201).json({});
  await subscriptions.insert(stringSubscription);

  const payload = JSON.stringify({
    title: "Spotter",
    message: "Notificações ativadas com sucesso, apenas aguarde agora.",
  });
  console.log({ subscription });

  webPush
    .sendNotification(subscription, payload)
    .catch((error) => console.error(error));
});

app.post("/notify", async (req, res) => {
  const { title, message, id } = req.body;
  const payload = JSON.stringify({ title, message });
  let allSubscriptions;

  if (id) {
    allSubscriptions = await subscriptions.getById(id);
  } else {
    allSubscriptions = await subscriptions.getAll();
  }

  for (const subscription of allSubscriptions) {
    webPush
      .sendNotification(JSON.parse(subscription.subscription), payload)
      .catch((error) => console.error(error));
  }

  res.send("notifications sent to all subscribers");
});

app.post("/roulette/latest", (req, res) => {
  const { id, color } = req.body;

  roulette.insert(id, color);
  res.send("ok");
});

app.post("/crash/latest", (req, res) => {
  const { id, crash_point } = req.body;

  crash.insert(id, crash_point);
  res.send("ok");
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
  try {
    const response = await crash.loadRecent();
    console.log({ response });
  } catch (err) {
    console.log(`Erro em crash.loadRecent`);
    console.log(err);
    setTimeout(async () => {
      const response = await crash.loadRecent();
      console.log({ response });
    }, 5000);
  }
}, 1000);

setInterval(async () => {
  try {
    const response = await crash.loadRecent();

    // notificar em caso de número abaixo de 6 ou acima de 10

    console.log({ response });
  } catch (err) {
    console.log(`Erro em crash.loadRecent`);
    console.log(err);
    setTimeout(async () => {
      const response = await crash.loadRecent();
      console.log({ response });
    }, 5000);
  }
}, 180000);

setTimeout(async () => {
  try {
    const response = await roulette.loadRecent();
    console.log({ response });
  } catch (err) {
    console.log(`Erro em roulette.loadRecent`);
    console.log(err);
    setTimeout(async () => {
      const response = await roulette.loadRecent();
      console.log({ response });
    }, 5000);
  }
}, 5000);

setInterval(async () => {
  try {
    const response = await roulette.loadRecent();
    // pegar id da última rodada
    // pegar últimos 8 brancos
    // notificar se os últimos 7 foram acima de 10 rodadas

    console.log({ response });
  } catch (err) {
    console.log(`Erro em roulette.loadRecent`);
    console.log(err);
    setTimeout(async () => {
      const response = await roulette.loadRecent();
      console.log({ response });
    }, 5000);
  }
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
