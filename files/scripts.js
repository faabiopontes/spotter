// Histórico Crash (só traz os últimos 80 registros)
// https://api-v2.blaze.com/crash_games/recent/history?page=1

// Histórico Roleta (só traz os últimos 80 registros)
// https://api-v2.blaze.com/roulette_games/recent/history?page=1

// const audio = new Audio(
//   "https://freesound.org/data/previews/565/565300_1648170-lq.mp3"
// );

parseCreatedAt = (createdAt) => {
  return createdAt
    .replaceAll("-", "\t")
    .replaceAll("T", "\t")
    .replaceAll(":", "\t")
    .slice(0, 19);
};

parseCreatedAtToUnixTime = (createdAt) => {
  const date = new Date(createdAt);
  return date.valueOf() / 1000;
};

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

const roulette = {
  history: [],
  page: 1,
  id: 2093218,
  keepCalling: true,
  allLines: "",
  lastSavedId: 2091120,
  errorHistory: [],
  call: () => {
    fetch(`https://api-v2.blaze.com/roulette_games/${roulette.id}`)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        const { id, created_at, color } = response;

        const body = { id, color, created_at };
        console.log(JSON.parse(body));
        // fetch('http://localhost:5000/roulette/insert', {
        //   method: 'POST',
        //   mode: 'no-cors',
        //   headers: {
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.parse(body)
        // });

        const parsedCreatedAt = parseCreatedAt(created_at);
        line = `${id}\t${color}\t${parsedCreatedAt}`;
        roulette.history.push(line);

        roulette.id--;
        if (roulette.keepCalling && roulette.id > roulette.lastSavedId) {
          setTimeout(() => {
            roulette.call();
          }, 10050);
        } else {
          console.log("Finished Roulette calls");
        }
      })
      .catch(() => {
        roulette.errorHistory.push(roulette.id);
        setTimeout(() => {
          roulette.call();
        }, 5000);
      });
  },
  compileAllLines: () => {
    roulette.history.forEach((line) => {
      roulette.allLines += `${line}\n`;
    });
  },
};
// roulette.call();

const crash = {
  history: [],
  errorHistory: [],
  page: 1,
  id: 2672470,
  keepCalling: true,
  allLines: "",
  lastSavedId: 2669984,
  lastId: 0,
  badWave: 0,
  badWaveNotificationTrigger: 7,
  crashPoints: [],
  spot: async () => {
    // crash.lastId = await crash.getLastId();
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
              notify(`Onda ruim acabou, crashou em ${floatCrashPoint}`);
            }
            crash.badWave = 0;
          }

          if (crash.badWave >= crash.badWaveNotificationTrigger) {
            notify(`Onda ruim acontecendo há ${crash.badWave} rodadas`);
          }
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
  },
  getLastId: async () => {
    const response = await fetch(
      "https://api-v2.blaze.com/roulette_games/recent"
    );
    const json = await response.json();
    return json[0].id;
  },
  call: () => {
    fetch(`https://api-v2.blaze.com/crash_games/${crash.id}`)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        const { id, created_at, crash_point } = response;
        const parsedCreatedAt = parseCreatedAt(created_at);
        line = `${id}\t${crash_point}\t${parsedCreatedAt}`;
        crash.history.push(line);

        crash.id--;

        if (crash.id > crash.lastSavedId) {
          setTimeout(() => {
            crash.call();
          }, 10050);
        } else {
          alert(`
            Finished Crash Calls
            Lines copied to clipboard
            Use Ctrl+V to Paste
          `);
          crash.compile();
        }
      })
      .catch((err) => {
        if (crash.id <= crash.lastSavedId) {
          return;
        }
        console.error(err);
        crash.errorHistory.push(crash.id);
        crash.id--;

        setTimeout(() => {
          crash.call();
        }, 10050);
      });
  },
  compile: () => {
    crash.history.reverse().forEach((line) => {
      crash.allLines += `${line}\n`;
    });
    window.copy(crash.allLines);
  },
};

window.onbeforeunload = function () {
  return "Block Reload";
};

crash.spot();
// crash.call();
