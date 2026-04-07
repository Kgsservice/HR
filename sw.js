// ============================================================
// TimeTrack Service Worker v1.0
// ============================================================

const CACHE_NAME = 'timetrack-v7';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
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

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache first, then network ──────────
self.addEventListener('fetch', event=>{
  // Skip Firebase, GAS, and non-GET requests
  if(event.request.method!=='GET') return;
  if(event.request.url.includes('firebasedatabase.app')) return;
  if(event.request.url.includes('script.google.com')) return;
  if(event.request.url.includes('googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached){
        // Return cache, but also update in background
        fetch(event.request).then(res=>{
          if(res&&res.status===200){
            caches.open(CACHE_NAME).then(cache=>cache.put(event.request,res.clone()));
          }
        }).catch(()=>{});
        return cached;
      }
      // Not in cache: fetch from network
      return fetch(event.request).then(res=>{
        if(res&&res.status===200&&event.request.url.startsWith('https://')){
          const resClone=res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,resClone));
        }
        return res;
      }).catch(()=>{
        // Offline fallback for HTML
        if(event.request.destination==='document'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
