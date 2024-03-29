if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env" });
}

const express = require("express");
const webPush = require("web-push");
const path = require("path");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "assets")));

const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails(
  "mailto:test@example.com",
  publicVapidKey,
  privateVapidKey
);

app.post("/subscribe", (req, res) => {
  const subscription = req.body;

  res.status(201).json({});

  const payload = JSON.stringify({
    title: "Spotter",
    message: "Notificações ativadas com sucesso, apenas aguarde agora.",
  });
  console.log({ subscription });

  webPush
    .sendNotification(subscription, payload)
    .catch((error) => console.error(error));
});

app.set("port", process.env.PORT || 5000);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
