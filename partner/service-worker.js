const CACHE_NAME = 'partner-driverbook-cache';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js'
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
    let datiNotifica = {
        titolo: 'DriverBook',
        corpo: 'Hai una nuova notifica',
        url: './bacheca.html'
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            datiNotifica.titolo = payload.title || datiNotifica.titolo;
            datiNotifica.corpo = payload.body || datiNotifica.corpo;
            datiNotifica.url = payload.url || datiNotifica.url;
        } catch (e) {
            datiNotifica.corpo = event.data.text();
        }
    }

    const opzioni = {
        body: datiNotifica.corpo,
        icon: '../logo/icona-pwa-prt.png',
        badge: '../logo/badge-bianco.png',
        vibrate: [200, 100, 200, 100, 200],
        data: { url: datiNotifica.url },
        requireInteraction: true,
        tag: 'driverbook-notifiche'
    };

    event.waitUntil(
        self.registration.showNotification(datiNotifica.titolo, opzioni)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlDestinazione = event.notification.data.url || './bacheca.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestre => {
            for (let i = 0; i < finestre.length; i++) {
                const client = finestre[i];
                if (client.url.includes('partner') && 'focus' in client) {
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