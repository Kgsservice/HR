// ============================================================
// TimeTrack Service Worker v2.0
// ============================================================

const CACHE_NAME = 'timetrack-v8';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
];

// ── Install: cache assets ─────────────────────────────────
self.addEventListener('install', event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>{
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS).catch(e=>console.warn('[SW] Some assets failed:',e));
    })
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────
self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache first, network fallback ─────────────────
self.addEventListener('fetch', event=>{
  // Skip Firebase + API calls
  if(event.request.url.includes('firebase') ||
     event.request.url.includes('googleapis') ||
     event.request.url.includes('script.google') ||
     event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(response=>{
        // Cache CDN scripts
        if(event.request.url.includes('cdnjs') || event.request.url.includes('jsdelivr')){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, clone));
        }
        return response;
      }).catch(()=>cached);
    })
  );
});
