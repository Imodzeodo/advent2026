/* 오프라인 지원: 한 번 열어 본 파일은 저장해 두었다가, 인터넷이 없어도 열리게 한다.
   - 첫 화면(index.html)은 늘 새 버전을 먼저 받아 본다(업데이트가 바로 보이게).
   - 나머지 파일은 저장본을 먼저 보여 주고 뒤에서 새로 받아 둔다. */
const CACHE = 'geubam-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate';
  const okHost = url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!okHost) return;
  if (isPage) {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
