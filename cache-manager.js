class CacheManager {
  constructor() {
    this.serviceWorker = null;
    this.isSupported = "serviceWorker" in navigator && "caches" in window;
    this.isRegistered = false;
  }

  async init() {
    if (!this.isSupported) {
      console.warn("oopz! Service Workers or Cache API not supported");
      return false;
    }

    try {
      // try multiple paths for better GitHub Pages PWA compatibility
      let swPath = "./sw.js";

      // so for GitHub Pages, try the repo-relative path if needed
      if (window.location.hostname.includes("github.io")) {
        const pathSegments = window.location.pathname
          .split("/")
          .filter(Boolean);
        if (pathSegments.length > 0) {
          // ,,,in a subdirectory (like /peedeeeff/), use absolute path
          swPath = window.location.pathname.endsWith("/")
            ? window.location.pathname + "sw.js"
            : window.location.pathname + "/sw.js";
        }
      }

      console.log("attempting to register service worker at:", swPath);
      let registration;

      try {
        registration = await navigator.serviceWorker.register(swPath);
        console.log("ohey! service Worker registered:", registration);
      } catch (firstError) {
        console.warn(
          "first attempt failed, trying fallback paths:",
          firstError,
        );

        // zomg so different fallback pathz for iOS PWA compatibility
        const fallbackPaths = [
          "./sw.js",
          "/sw.js",
          window.location.origin + "/sw.js",
          window.location.href.split("/").slice(0, -1).join("/") + "/sw.js",
        ];

        let lastError = firstError;
        for (const fallbackPath of fallbackPaths) {
          if (fallbackPath === swPath) continue; // we already try'd, skip!

          try {
            console.log("trying fallback path:", fallbackPath);
            registration = await navigator.serviceWorker.register(fallbackPath);
            console.log(
              "ohey! service Worker registered with fallback:",
              registration,
            );
            break;
          } catch (error) {
            console.warn("fallback failed:", fallbackPath, error);
            lastError = error;
          }
        }

        if (!registration) {
          throw lastError;
        }
      }

      await navigator.serviceWorker.ready;
      this.serviceWorker =
        registration.active || registration.waiting || registration.installing;
      this.isRegistered = true;

      return true;
    } catch (error) {
      console.error("onoz! service Worker registration failed:", error);
      return false;
    }
  }

  async sendMessage(type, data = {}) {
    if (!this.isRegistered || !this.serviceWorker) {
      console.error(
        "CACHE MGR: ServiceWorker not available for message:",
        type,
      );
      throw new Error("Service Worker not available. bah! go away! :(");
    }

    console.log("CACHE MGR: sending message to SW:", type, data);

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      // add some timeout to prevent stalling
      const timeout = setTimeout(() => {
        reject(new Error(`ServiceWorker message timeout for: ${type}`));
      }, 30000); // 30 sec

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        console.log("CACHE MGR: received SW response:", event.data);

        if (event.data.success) {
          resolve(event.data);
        } else {
          reject(new Error(event.data.error || "unknown error i guess"));
        }
      };

      this.serviceWorker.postMessage({ type, data }, [messageChannel.port2]);
    });
  }

  async discoverAllImages() {
    // grab the pathz from this special <script> tag
    const pathsScript = document.getElementById("paths-data");
    if (!pathsScript) {
      throw new Error("Paths data not found");
    }

    const pathsData = JSON.parse(pathsScript.textContent);
    const allUrls = [];

    console.log("discovering images for", pathsData.length, "base paths...");

    for (const [basePath, expectedCount] of pathsData) {
      console.log(`Checking ${basePath} (expected: ${expectedCount} pages)`);

      // try to guess count first? then go a bit beyond to catch any extras.
      const maxToCheck = Math.max(expectedCount + 5, 20);

      for (let i = 0; i < maxToCheck; i++) {
        const num = String(i).padStart(3, "0");
        const url = `${basePath}/page-${num}.webp`;

        try {
          // check if the image exists with a HEAD request
          const response = await fetch(url, { method: "HEAD" });
          if (response.ok) {
            allUrls.push(url);
          } else if (i >= expectedCount) {
            // stop checking this path if beyond expected count and hit 404
            break;
          }
        } catch (error) {
          // network error or similar - stop checking this path
          if (i >= expectedCount) {
            break;
          }
        }
      }
    }

    console.log(`Discovered ${allUrls.length} total images`);
    return allUrls;
  }

  async cacheAllImages(onProgress = null) {
    console.log("CACHE MGR: starting to cache all images...");
    const urls = await this.discoverAllImages();

    if (onProgress) {
      onProgress({ type: "start", total: urls.length });
    }

    try {
      const result = await this.sendMessage("CACHE_IMAGES", { urls });
      console.log("CACHE MGR: Caching result:", result);

      if (onProgress) {
        onProgress({
          type: "complete",
          cached: result.cached.length,
          failed: result.failed.length,
          total: urls.length,
        });
      }

      return result;
    } catch (error) {
      console.error("CACHE MGR: caching failed:", error);
      if (onProgress) {
        onProgress({ type: "error", error: error.message });
      }
      throw error;
    }
  }

  async clearCache() {
    console.log("CACHE MGR: clearing cache...");
    try {
      const result = await this.sendMessage("CLEAR_CACHE");
      console.log("CACHE MGR: cache cleared successfully");
      return result;
    } catch (error) {
      console.error("CACHE MGR: failed to clear cache:", error);
      throw error;
    }
  }

  async getCacheStatus() {
    try {
      const result = await this.sendMessage("GET_CACHE_STATUS");
      console.log("CACHE MGR: status result:", result.status);
      return result.status;
    } catch (error) {
      console.error("CACHE MGR: failed to get cache status:", error);
      return {
        totalCached: 0,
        cacheExists: false,
        hasCacheStorage: false,
        lastUpdated: Date.now(),
        error: error.message,
      };
    }
  }

  async requestPersistentStorage() {
    if ("storage" in navigator && "persist" in navigator.storage) {
      try {
        const isPersistent = await navigator.storage.persist();
        console.log("persistent storage:", isPersistent ? "granted" : "denied");
        return isPersistent;
      } catch (error) {
        console.warn("oopz, could not request persistent storage:", error);
        return false;
      }
    }
    return false;
  }

  async getStorageEstimate() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          percentUsed: estimate.quota
            ? ((estimate.usage / estimate.quota) * 100).toFixed(2)
            : 0,
        };
      } catch (error) {
        console.warn("Could not get storage estimate:", error);
        return null;
      }
    }
    return null;
  }
}

// plop it down on the global window obj
window.cacheManager = new CacheManager();
