/*
 * Service worker for Phrasebook.
 *
 * Two jobs: make the app open with no network, and never trap you on an old
 * version of it.
 *
 * Strategy is network-first for the page itself, cache-first for the static
 * bits beside it. That means when you have signal you always get the current
 * app, and when you don't you get the last one that loaded. The alternative —
 * cache-first for everything — launches a few milliseconds faster and can pin
 * you to a stale app for weeks. Not worth it.
 *
 * This worker never touches localStorage. Your saved phrases are not in here
 * and clearing this cache cannot lose them.
 *
 * ---------------------------------------------------------------------------
 * BUMP `VERSION` WHENEVER phrasebook.html OR ANYTHING IN PRECACHE CHANGES.
 * The cache name is derived from it, so bumping it is what evicts the old
 * files. Forget, and an offline launch can serve the previous app.
 * ---------------------------------------------------------------------------
 */
"use strict";

const VERSION = "1";
const CACHE = "phrasebook-v" + VERSION;

/* Relative paths throughout: this is served from a subpath on GitHub Pages
   (/Eng-Phrases/), so anything absolute would resolve off the site entirely.
   Case has to match the files on disk exactly — Pages is case-sensitive even
   though macOS is not. */
const PRECACHE = [
  "index.html",
  "phrasebook.html",
  "manifest.json",
  "icons/icon-32.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* The page: network first, so an update lands as soon as there's signal.
     Offline, fall back to whatever we have — and if the exact URL isn't
     cached (someone opened the bare directory URL, say), serve the app
     itself rather than failing. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("phrasebook.html")))
    );
    return;
  }

  /* Everything else — icons, the manifest — is cache first. These only change
     when VERSION changes, and that wipes the cache anyway. */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
