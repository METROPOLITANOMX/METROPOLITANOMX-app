var CACHE_NAME = "mxp-cache-v202611241108";
var APP_SHELL = [
  "./",
  "./index.html",
  "./antena.html",
  "./director.html",
  "./piloto.html",
  "./vivo.html",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(
        APP_SHELL.map(function(url) {
          return cache.add(url).catch(function() {});
        })
      );
    })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k) {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = req.url || "";
  if (url.indexOf("firebaseio.com") >= 0 || url.indexOf("firebasedatabase.app") >= 0 || url.indexOf("http") !== 0) return;
  if (url.indexOf(self.location.origin) !== 0) return;

  e.respondWith(
    fetch(req).then(function(res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, copy).catch(function() {});
        });
      }
      return res;
    }).catch(function() {
      return caches.match(req, { ignoreSearch: true });
    })
  );
});