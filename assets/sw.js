self.addEventListener("push", (event) => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.message,
    vibrate: [1000, 1000, 1000, 1000, 1000, 1000]
  });
});

