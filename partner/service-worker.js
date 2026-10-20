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
    let urlDestinazione = './bacheca.html';
    
    if (event.data) {
        try {
            const payload = event.data.json();
            if (payload.url) urlDestinazione = payload.url;
        } catch (e) {}
    }

    const gestisciNotifica = self.registration.getNotifications({ tag: 'driverbook-notifiche' }).then(notifiche => {
        let conteggio = 1;
        
        if (notifiche && notifiche.length > 0) {
            const vecchia = notifiche[0];
            if (vecchia.data && vecchia.data.conteggio) {
                conteggio = vecchia.data.conteggio + 1;
            }
        }

        let titoloNotifica = conteggio === 1 ? "1 nuovo servizio disponibile" : `${conteggio} nuovi servizi disponibili`;

        if ('setAppBadge' in navigator) {
            navigator.setAppBadge(conteggio).catch(() => {});
        }

        const opzioni = {
            body: "Controlla la bacheca per i dettagli.",
            icon: '../logo/icona-pwa-prt.png',
            badge: '../logo/badge-bianco.png',
            data: { 
                url: urlDestinazione,
                conteggio: conteggio 
            },
            requireInteraction: true,
            tag: 'driverbook-notifiche',
            silent: true
        };

        return self.registration.showNotification(titoloNotifica, opzioni);
    });

    event.waitUntil(gestisciNotifica);
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