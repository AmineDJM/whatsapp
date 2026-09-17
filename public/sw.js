// Minimal service worker: offline app-shell caching + notification click handling.
const CACHE = 'wa-clone-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  // Never cache Supabase API/realtime/storage calls
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/rest') || url.pathname.startsWith('/realtime')) return
  // Network-first for navigations (SPA), cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {})
      return res
    }).catch(() => cached))
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url || '/'
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(target); return c.focus() } }
    return clients.openWindow(target)
  }))
})
