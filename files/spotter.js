const notify = async (message) => {
  if (!("Notification" in window)) {
    return alert("Este browser não suporta notificações de Desktop");
  }

  if (Notification.permission !== "granted") {
    permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return alert(
        "Notificações não foram aceitas! Verifique as permissões no site!"
      );
    }
  }

  new Notification(message);
};

const crash = {
  badWave: 0,
  badWaveNotificationTrigger: 5,
  crashPoints: [],
  sentNotifications: [],
  spot: async () => {
    const targetNode = document.querySelector(".crash-previous .entries");
    const config = { childList: true, subtree: true };

    const callback = function (mutationsList, observer) {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const crash_point = mutation.target.firstElementChild.innerHTML.slice(
            0,
            -1
          );
          const floatCrashPoint = parseFloat(crash_point);
          crash.crashPoints.push(floatCrashPoint);

          if (floatCrashPoint < 2) {
            crash.badWave++;
          } else {
            if (crash.badWave >= crash.badWaveNotificationTrigger) {
              const notificationMessage = `Onda ruim acabou após ${crash.badWave} rodadas, crashando em ${floatCrashPoint}`;
              crash.sentNotifications.push(notificationMessage);
              notify(notificationMessage);
            }
            crash.badWave = 0;
          }

          if (crash.badWave >= crash.badWaveNotificationTrigger) {
              const notificationMessage = `Onda ruim acontecendo há ${crash.badWave} rodadas`;
              crash.sentNotifications.push(notificationMessage);
              notify(notificationMessage);
          }

          console.clear();
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  }
};

window.onbeforeunload = function () {
  return "Block Reload";
};

crash.spot();