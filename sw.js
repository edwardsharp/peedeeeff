const CACHE_NAME = "peedeeeff-cache-v1";
const STATIC_CACHE_NAME = "peedeeeff-static-v1";

// Static files to cache immediately - with GitHub Pages path detection
function getStaticFiles() {
  const basePath = self.location.pathname.split("/").slice(0, -1).join("/");
  const files = [
    "", // Root path for index.html
    "index.html",
    "pee-dee-eff.js",
    "cache-manager.js",
    "really-simple.html",
  ];

  return files.map((file) => {
    if (file === "") {
      return basePath || "/";
    }
    return basePath ? `${basePath}/${file}` : `/${file}`;
  });
}

const STATIC_FILES = getStaticFiles();

// Install event - cache static files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static files:", STATIC_FILES);
        return cache.addAll(STATIC_FILES).catch((error) => {
          console.error("Service Worker: Failed to cache static files:", error);
          // Continue anyway - don't let static file caching prevent SW installation
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  console.log("SW: Fetch event for:", request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    console.log("SW: Skipping different origin");
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) {
        console.log("Service Worker: Serving from cache:", request.url);
        return cachedResponse;
      }

      // Try alternative URL formats for cache key matching
      const cache = await caches.open(CACHE_NAME);
      const pathname = url.pathname;

      // Debug: show what we're looking for vs what's cached
      const cachedKeys = await cache.keys();
      if (cachedKeys.length > 0) {
        console.log("SW: Looking for:", pathname);
        console.log("SW: First cached URL:", cachedKeys[0].url);
      }

      // Try different URL formats that might be in cache
      const alternativeUrls = [
        pathname, // /peedeeeff/geozone/strange-natures-print/page-000.webp
        pathname.replace(/^\/[^\/]+/, ""), // /geozone/strange-natures-print/page-000.webp
        "/" + pathname.split("/").slice(-3).join("/"), // /strange-natures-print/page-000.webp
        pathname.split("/").slice(-3).join("/"), // strange-natures-print/page-000.webp
      ];

      for (const altUrl of alternativeUrls) {
        if (altUrl && altUrl !== pathname) {
          const altRequest = new Request(new URL(altUrl, url.origin));
          const altCachedResponse = await cache.match(altRequest);
          if (altCachedResponse) {
            console.log(
              "Service Worker: Found in cache with alternative URL:",
              altUrl,
            );
            return altCachedResponse;
          }
        }
      }

      console.log("Service Worker: Fetching from network:", request.url);
      return fetch(request)
        .then((response) => {
          // don't cache if not a successful response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // clone the response since it can only be consumed once...
          const responseToCache = response.clone();

          // cache .webp images automagically
          if (request.url.includes(".webp")) {
            caches.open(CACHE_NAME).then((cache) => {
              console.log("Service Worker: Auto-caching image:", request.url);
              cache.put(request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // For HTML pages, try to serve index.html from cache as fallback
          if (request.mode === "navigate") {
            return caches.open(STATIC_CACHE_NAME).then((cache) => {
              return cache.match("index.html");
            });
          }

          // if network fails and we're looking for an image, return a placeholder
          if (request.url.includes(".webp")) {
            console.log(
              "Service Worker: Network failed for image, no cached version available",
            );
          }
          throw new Error("network failed and no cached version available");
        });
    }),
  );
});

// listen for messages from the main thread 👂
self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "CACHE_IMAGES":
      handleCacheImages(data.urls)
        .then((result) => {
          event.ports[0].postMessage({
            success: true,
            cached: result.cached,
            failed: result.failed,
          });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;

    case "CLEAR_CACHE":
      handleClearCache()
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;

    case "GET_CACHE_STATUS":
      handleGetCacheStatus()
        .then((status) => {
          event.ports[0].postMessage({ success: true, status });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
  }
});

async function handleCacheImages(urls) {
  const cache = await caches.open(CACHE_NAME);
  const results = { cached: [], failed: [] };

  console.log(`Service Worker: Starting to cache ${urls.length} images`);

  const BATCH_SIZE = 10;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            results.cached.push(url);
            console.log(`Service Worker: Cached ${url}`);
          } else {
            results.failed.push(url);
            console.warn(
              `Service Worker: Failed to fetch ${url} - ${response.status}`,
            );
          }
        } catch (error) {
          results.failed.push(url);
          console.error(`Service Worker: Error caching ${url}:`, error);
        }
      }),
    );

    // small delay between batches to prevent a traffic jamm
    if (i + BATCH_SIZE < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `service Worker: donzo! cached: ${results.cached.length}, but maybe these failed: ${results.failed.length}`,
  );
  return results;
}

async function handleClearCache() {
  console.log("Service Worker: Clearing cache");
  try {
    // clear both caches to be thorough
    const deleted1 = await caches.delete(CACHE_NAME);
    const deleted2 = await caches.delete(STATIC_CACHE_NAME);

    // recreate static cache
    const staticCache = await caches.open(STATIC_CACHE_NAME);
    await staticCache.addAll(STATIC_FILES);

    console.log(
      "service Worker: cache cleared successfully. image cache deleted:",
      deleted1,
      "static cache recreated",
    );
    return { deleted: deleted1, recreatedStatic: true };
  } catch (error) {
    console.error("service Worker: error clearing cache:", error);
    throw error;
  }
}

async function handleGetCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const imageKeys = keys.filter((key) => key.url.includes(".webp"));

    console.log(
      "service Worker: cache status cha-check -",
      imageKeys.length,
      "images found",
    );

    // check if any cache exists at all?
    const allCacheNames = await caches.keys();
    const hasCacheStorage = allCacheNames.includes(CACHE_NAME);

    return {
      totalCached: imageKeys.length,
      cacheExists: hasCacheStorage && imageKeys.length > 0,
      hasCacheStorage: hasCacheStorage,
      cacheNames: allCacheNames,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error("oopz! service worker: rrror checking cache status:", error);
    return {
      totalCached: 0,
      cacheExists: false,
      hasCacheStorage: false,
      cacheNames: [],
      lastUpdated: Date.now(),
      error: error.message,
    };
  }
}
