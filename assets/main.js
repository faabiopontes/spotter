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

const publicVapidKey = "BJevSAEJR_PNslRO9eKbTXhQ8cktL3m9XnvzzSRWs5sPlCDl2krqIfH9rlJwQPYK8Kzv5Q4JQtIomwYf9cODLPg";

const triggerPush = document.querySelector(".trigger-push");

async function triggerPushNotification() {
  if ("serviceWorker" in navigator) {
    const register = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    console.log({ subscription });

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

triggerPush.addEventListener("click", () => {
  triggerPushNotification().catch((error) => console.error(error));
});
