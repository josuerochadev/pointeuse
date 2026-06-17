const CACHE_PREFIX = 'pointeuse-';
const CACHE_NAME = CACHE_PREFIX + 'v17';
const ASSETS = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './compute.js',
  './sync.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap'
];

// Files that should use network-first (get updates immediately)
const NETWORK_FIRST = ['index.html', 'style.css', 'compute.js', 'sync.js', 'app.js'];

// Install: cache core assets, wait for activation signal
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Listen for skip-waiting message from the app
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for navigation and app files (HTML, CSS, JS)
  const isAppFile = e.request.mode === 'navigate' || NETWORK_FIRST.some(f => url.pathname.endsWith(f));

  if (isAppFile) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(cached => {
            if (cached) return cached;
            if (e.request.mode === 'navigate') return caches.match('./offline.html');
            return cached;
          })
        )
    );
    return;
  }

  // Cache-first for everything else (fonts, icons, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
