const CACHE_NAME = 'sunbook-static-v2';
const APP_SHELL = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/responsive.css',
    '/js/api.js',
    '/js/i18n.js',
    '/js/script.js',
    '/js/pwa.js',
    '/components/header.html',
    '/components/footer.html',
    '/manifest.json',
    '/assets/sun-icon.png',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/icon-maskable.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('sunbook-static-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    if (url.pathname.endsWith('/reader.html')) {
        event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => new Response(
            '<!doctype html><meta charset="utf-8"><title>Online reading required</title><main style="font:16px sans-serif;padding:2rem"><h1>Connect to the internet to read</h1><p>قراءة الكتب تحتاج إلى اتصال بالإنترنت. صفحات الكتب لا تُحفظ دون اتصال.</p></main>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        )));
        return;
    }

    if (url.search || !/\.(html|css|js|png|webp|woff2|json)$/.test(url.pathname) && url.pathname !== '/') return;
    event.respondWith(
        fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
                const copy = response.clone();
                event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
            }
            return response;
        }).catch(async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('/index.html');
            return Response.error();
        })
    );
});
