const CACHE_NAME = 'partner-driverbutler-cache';
const urlsToCache = [
    './',
    './index.html',
    './style_prt.css',
    './script_prt.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting(); 
});

self.addEventListener('activate', event => {
    const cacheConsentite = [CACHE_NAME, 'driverbutler-partner-session'];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheConsentite.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }
    event.respondWith(
        fetch(new Request(event.request, { cache: 'no-store' }))
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
            const cache = await caches.open('driverbutler-partner-session');
            const res = await cache.match('/auth-status');
            
            if (res) {
                const authStatus = await res.json();
                const tutteLeFinestre = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                const finestrePartner = tutteLeFinestre.filter(c => c.url.includes('/partner/'));

                if (authStatus.ricordami === false && finestrePartner.length === 0) {
                    const sub = await self.registration.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                    await cache.delete('/auth-status');
                    return;
                }
            }

            let urlDestinazione = './bacheca_prt.html';
            let payloadDati = {};
            if (event.data) {
                try {
                    payloadDati = event.data.json();
                    if (payloadDati.url) urlDestinazione = payloadDati.url;
                } catch (e) {}
            }

            if (payloadDati.tipo === 'SOLLECITO_SCADENZA') {
                const oraItaliaStr = new Date().toLocaleString('en-US', {
                    timeZone: 'Europe/Rome',
                    hour: 'numeric',
                    hour12: false
                });
                const oraItalia = parseInt(oraItaliaStr, 10);
                const isNotte = (oraItalia >= 22 || oraItalia < 7);

                const opzioniSollecito = {
                    body: payloadDati.body || "Sta scadendo una richiesta di servizio. Apri la bacheca e prendila in carico prima che venga annullata.",
                    icon: '../logo/icona-pwa-prt.png',
                    badge: '../logo/badge-bianco.png',
                    data: {
                        url: urlDestinazione
                    },
                    tag: 'driverbutler-sollecito',
                    renotify: true,
                    silent: isNotte
                };

                if (!isNotte) {
                    opzioniSollecito.vibrate = [200, 100, 200];
                }

                await self.registration.showNotification(payloadDati.title || "Richiesta in scadenza", opzioniSollecito);
                return;
            }

            const notifiche = await self.registration.getNotifications({ tag: 'driverbutler-notifiche' });
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
                tag: 'driverbutler-notifiche',
                silent: true
            };

            await self.registration.showNotification(titoloNotifica, opzioni);

        } catch (e) {
            console.error(e);
        }
    })());
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlDestinazione = event.notification.data.url || './bacheca_prt.html';

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