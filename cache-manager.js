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

  async buildImageUrls(onProgress = null) {
    // Get the paths data from the script tag in the HTML
    const pathsScript = document.getElementById("paths-data");
    if (!pathsScript) {
      throw new Error("Paths data not found");
    }

    const pathsData = JSON.parse(pathsScript.textContent);
    const allUrls = [];

    console.log("building image list for", pathsData.length, "base paths...");

    // Process each base path using expected counts (skip discovery to avoid CORS)
    for (let folderIndex = 0; folderIndex < pathsData.length; folderIndex++) {
      const [basePath, expectedCount] = pathsData[folderIndex];
      console.log(`Building URLs for ${basePath} (${expectedCount} pages)`);

      if (onProgress) {
        onProgress({
          type: "discovering",
          folder: basePath,
          current: folderIndex + 1,
          total: pathsData.length,
        });
      }

      // Build URLs based on expected count (no checking to avoid CORS)
      for (let i = 0; i < expectedCount; i++) {
        const num = String(i).padStart(3, "0");
        let url = `${basePath}/page-${num}.webp`;

        // Add GitHub Pages path prefix if needed
        if (window.location.hostname.includes("github.io")) {
          const pathSegments = window.location.pathname
            .split("/")
            .filter(Boolean);
          if (pathSegments.length > 0) {
            // Ensure consistent path format for GitHub Pages
            if (
              !url.startsWith("/" + pathSegments[0] + "/") &&
              !url.startsWith("http")
            ) {
              // Remove leading slash if present, then add proper prefix
              const cleanUrl = url.startsWith("/") ? url.substring(1) : url;
              url = "/" + pathSegments[0] + "/" + cleanUrl;
            }
          }
        }

        allUrls.push(url);
      }

      console.log(`Built ${expectedCount} URLs for ${basePath}`);
    }

    console.log(`Built ${allUrls.length} total image URLs`);
    return allUrls;
  }

  async cacheAllImages(onProgress = null) {
    console.log("Cache Manager: Starting to cache all images...");

    try {
      const urls = await this.buildImageUrls(onProgress);

      console.log(
        "Cache Manager: URL building complete, built",
        urls.length,
        "URLs",
      );

      if (urls.length === 0) {
        console.log("Cache Manager: No images found to cache");
        if (onProgress) {
          onProgress({ type: "complete", cached: 0, failed: 0, total: 0 });
        }
        return { cached: [], failed: [] };
      }

      if (onProgress) {
        onProgress({ type: "start", total: urls.length });
      }

      // cache images one by one to get progress updates
      const results = { cached: [], failed: [] };

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        if (onProgress) {
          onProgress({
            type: "progress",
            url: url,
            current: i + 1,
            total: urls.length,
          });
        }

        try {
          console.log("Cache Manager: Requesting cache for", url);
          const result = await this.sendMessage("CACHE_IMAGES", {
            urls: [url],
          });
          console.log("Cache Manager: Got result for", url, result);
          if (result.cached.length > 0) {
            results.cached.push(...result.cached);
          }
          if (result.failed.length > 0) {
            results.failed.push(...result.failed);
          }
        } catch (error) {
          console.warn("Failed to cache image:", url, error);
          results.failed.push(url);
        }
      }

      console.log("Cache Manager: Caching complete:", results);

      if (onProgress) {
        onProgress({
          type: "complete",
          cached: results.cached.length,
          failed: results.failed.length,
          total: urls.length,
        });
      }

      return results;
    } catch (error) {
      console.error("Cache Manager: Caching failed:", error);
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
