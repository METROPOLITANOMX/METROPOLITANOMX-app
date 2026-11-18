self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});

// v20261118192914