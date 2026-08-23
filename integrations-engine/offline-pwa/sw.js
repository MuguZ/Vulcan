const CACHE_NAME = "vulcan-sos-cache-v1";

const URLS_TO_CACHE = [
    "./index.html",
    "./sw.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(URLS_TO_CACHE))
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {

                // Use cached file if available
                if (response) {
                    return response;
                }

                // Otherwise try the internet
                return fetch(event.request)
                    .catch(() => caches.match("./index.html"));
            })
    );
});