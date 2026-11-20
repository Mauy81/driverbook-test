const CACHE_NAME = 'driverbutler-pax-cache';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './traduzioni.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
        .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
            }
            return response;
        })
        .catch(() => {
            return caches.match(event.request);
        })
    );
});

self.addEventListener('push', event => {
    event.waitUntil((async () => {
        try {
            const cache = await caches.open('driverbutler-pax-session');
            const res = await cache.match('/auth-status');
            
            if (res) {
                const authStatus = await res.json();
                const tutteLeFinestre = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                const finestrePax = tutteLeFinestre.filter(c => c.url.includes('/passeggeri/'));

                if (authStatus.ricordami === false && finestrePax.length === 0) {
                    const sub = await self.registration.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                    await cache.delete('/auth-status');
                    return;
                }
            }

            let urlDestinazione = './viaggiprogrammati.html';
            let titoloNotifica = "Aggiornamento Viaggio";
            let corpoNotifica = "Controlla i tuoi viaggi in programma per i dettagli.";

            if (event.data) {
                try {
                    const payload = event.data.json();
                    if (payload.url) urlDestinazione = payload.url;
                    if (payload.title) titoloNotifica = payload.title;
                    if (payload.body) corpoNotifica = payload.body;
                } catch (e) {}
            }

            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1).catch(() => {});
            }

            const opzioni = {
                body: corpoNotifica,
                icon: '../logo/icona-pwa.png',
                badge: '../logo/badge-bianco.png',
                data: { 
                    url: urlDestinazione
                },
                tag: 'driverbutler-pax-notifiche'
            };

            await self.registration.showNotification(titoloNotifica, opzioni);

        } catch (e) {
            console.error(e);
        }
    })());
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlDestinazione = event.notification.data.url || './viaggiprogrammati.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestre => {
            for (let i = 0; i < finestre.length; i++) {
                const client = finestre[i];
                if (client.url.includes('passeggeri') && 'focus' in client) {
                    client.navigate(urlDestinazione);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlDestinazione);
            }
        })
    );
});