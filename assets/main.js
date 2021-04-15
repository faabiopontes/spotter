function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const publicVapidKey =
  "BJevSAEJR_PNslRO9eKbTXhQ8cktL3m9XnvzzSRWs5sPlCDl2krqIfH9rlJwQPYK8Kzv5Q4JQtIomwYf9cODLPg";

const triggerPush = document.querySelector(".trigger-push");

async function triggerPushNotification() {
  if ("serviceWorker" in navigator) {
    const register = await navigator.serviceWorker.register("/sw.js?v=2", {
      scope: "/",
    });

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    register.update();

    await fetch("/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    console.error("Service workers are not supported in this browser");
  }
}

const btnNotificationsChangeText = () => {
  triggerPush.innerHTML = "Notificações Ativadas! Aguarde para Apostar!";
};
const notificationsActivated =
  localStorage.getItem("@fsp:notifications-activated") == "true";

if (!notificationsActivated) {
  triggerPush.addEventListener("click", async () => {
    try {
      await triggerPushNotification();
      localStorage.setItem("@fsp:notifications-activated", "true");
      btnNotificationsChangeText();
    } catch (error) {
      console.error(error);
    }
  });
} else {
  btnNotificationsChangeText();
}

const activateSounds = (element) => {
  element.innerHTML = "Sons Ativados! Agora é só deixar essa aba aberta!";
};

// Socket
const socket = io();
const audios = ["blaze_win_x3", "blaze_win", "bora_faturar"];

socket.on("play", function (id) {
  const audio = new Audio(`/sounds/${audios[id]}.mp3`);
  audio.play();
});

socket.on("counter", function (msg) {
  const counter = document.querySelector("#counter");

  counter.textContent = msg;
});

socket.on("crash_games", function (msg) {
  const crash_games = document.querySelector("#crash_games");

  crash_games.textContent = JSON.stringify(msg, undefined, 2);
});
