var CACHE_NAME = "mxp-cache-v202611280246-sens-rearm";
var CACHE_PREFIX = "mxp-cache-";
var ESSENTIAL_SHELL = [
  "./",
  "./index.html",
  "./antena.html",
  "./director.html",
  "./admin.html",
  "./manual.html",
  "./piloto.html",
  "./vivo.html",
  "./mx.css",
  "./mx-core.js",
  "./mx-index.js",
  "./mx-antena.js",
  "./mx-piloto.js",
  "./mx-vivo.js",
  "./mx-garaje.js",
  "./mx-garaje-color.js",
  "./mx-tiempos.js",
  "./mx-director-cam.js",
  "./mx-director-admin.js",
  "./mx-director-carrera.js",
  "./mx-director-main.js",
  "./mx-admin.js"
];
var OPTIONAL_SHELL = [
  "./manifest.json",
  "./manifest_director.json",
  "./logo.png"
];

function cargarRecurso(cache, url) {
  return fetch(url, { cache: "no-store" }).then(function(res) {
    if (!res || !res.ok) throw new Error("No se pudo cachear " + url);
    return cache.put(url, res);
  });
}

self.addEventListener("install", function(e) {
  var stagingName = CACHE_NAME + "-staging";
  e.waitUntil(
    caches.delete(stagingName).then(function() {
      return caches.open(stagingName);
    }).then(function(staging) {
      return Promise.all(ESSENTIAL_SHELL.map(function(url) {
        return cargarRecurso(staging, url);
      })).then(function() {
        return Promise.all(OPTIONAL_SHELL.map(function(url) {
          return cargarRecurso(staging, url).catch(function(err) {
            console.warn("Recurso opcional no cacheado:", url, err);
          });
        }));
      }).then(function() {
        return caches.delete(CACHE_NAME);
      }).then(function() {
        return caches.open(CACHE_NAME);
      }).then(function(finalCache) {
        return staging.keys().then(function(requests) {
          return Promise.all(requests.map(function(req) {
            return staging.match(req).then(function(res) {
              if (!res) throw new Error("Falta recurso en caché temporal: " + req.url);
              return finalCache.put(req, res);
            });
          })).then(function() {
            return Promise.all(ESSENTIAL_SHELL.map(function(url) {
              return finalCache.match(url).then(function(res) {
                if (!res) throw new Error("Falta recurso esencial: " + url);
              });
            }));
          });
        });
      });
    }).then(function() {
      return caches.delete(stagingName);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      return Promise.all([caches.delete(CACHE_NAME), caches.delete(stagingName)]).then(function() {
        throw err;
      });
    })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME) return caches.delete(k);
      }));
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
    fetch(req, { cache: "no-store" }).then(function(res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, copy).catch(function(err) { console.warn("No se pudo actualizar la caché:", err); });
        }).catch(function(err) { console.warn("No se pudo abrir la caché:", err); });
      }
      return res;
    }).catch(function() {
      return caches.match(req, { ignoreSearch: true }).then(function(cached) {
        return cached || Response.error();
      });
    })
  );
});
