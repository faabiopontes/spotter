self.addEventListener("push", (event) => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.message,
    vibrate: [500, 400, 500, 400, 500, 400]
  });
});



self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    fetch('https://luvesero.com.br/pushsubscriptionchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_endpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
        new_endpoint: event.newSubscription ? event.newSubscription.endpoint : null,
        new_p256dh: event.newSubscription ? event.newSubscription.toJSON().keys.p256dh : null,
        new_auth: event.newSubscription ? event.newSubscription.toJSON().keys.auth : null
      })
    })
  );
});