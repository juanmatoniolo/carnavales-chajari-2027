// public/sw.js
const CACHE_VERSION = "carnavales-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = ["/", "/offline.html"];

// ---------- Install ----------
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting())
			.catch(() => self.skipWaiting()),
	);
});

// ---------- Activate ----------
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) =>
								key !== STATIC_CACHE && key !== RUNTIME_CACHE,
						)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// ---------- Fetch ----------
self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (url.hostname.includes("firebaseio")) return;
	if (url.pathname.startsWith("/api/")) return;

	// Navegaciones HTML: network-first con fallback offline
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches
						.open(RUNTIME_CACHE)
						.then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() =>
					caches
						.match(request)
						.then((cached) => cached || caches.match(OFFLINE_URL)),
				),
		);
		return;
	}

	// Estáticos: cache-first
	const isStatic =
		url.pathname.startsWith("/_next/static/") ||
		/\.(png|jpe?g|webp|svg|gif|ico|woff2?|css|js|json|xml|txt)$/.test(
			url.pathname,
		);

	if (isStatic) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches
							.open(RUNTIME_CACHE)
							.then((cache) => cache.put(request, copy));
					}
					return response;
				});
			}),
		);
	}
});
