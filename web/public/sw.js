self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

self.addEventListener('fetch', (event) => {
  // A basic pass-through fetch handler is required for a PWA to be installable.
  event.respondWith(fetch(event.request));
});
