// التطبيق (PWA) بتاع القارئ بس: الـ service worker بيشتغل على reader.html فقط.
// باقي صفحات الموقع بتنضّف أي service worker وكاش قديم من النسخة اللي كانت بتثبّت الموقع كله.
(function () {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

    var READER_PATH = '/reader.html';
    var isReaderPage = /\/reader\.html$/.test(window.location.pathname);

    window.addEventListener('load', function () {
        var readerScope = new URL(READER_PATH, window.location.origin).href;

        var cleanup = navigator.serviceWorker.getRegistrations()
            .then(function (registrations) {
                return Promise.all(registrations
                    .filter(function (registration) { return registration.scope !== readerScope; })
                    .map(function (registration) { return registration.unregister(); }));
            })
            .then(function () {
                if (!('caches' in window)) return null;
                return caches.keys().then(function (keys) {
                    return Promise.all(keys
                        .filter(function (key) { return key.indexOf('sunbook-static-') === 0; })
                        .map(function (key) { return caches.delete(key); }));
                });
            })
            .catch(function () { /* مش مهم */ });

        if (!isReaderPage) return;
        cleanup.then(function () {
            return navigator.serviceWorker.register('/sw.js', { scope: READER_PATH });
        }).catch(function (error) {
            console.error('Service worker registration failed:', error);
        });
    });
})();
