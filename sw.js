var CACHE_NAME = "mxp-cache-v202611230412";
var APP_SHELL = [
  "./",
  "./index.html",
  "./antena.html",
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
    caches.keys()