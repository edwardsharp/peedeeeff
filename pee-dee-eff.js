class PeeDeeEff extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.images = [];
    this.index = 0;
    this._clickSuppressed = false;
    this._observer = null;
    this.NAV_BUTTON_HIDE_AFTER_MS = 1234;
  }

  connectedCallback() {
    const bg = this.getAttribute("background") || "white";
    this.loop = this.getAttribute("loop") === "true";
    this.firstLastSingle = this.getAttribute("first-last-single") === "true";
    const direction = this.getAttribute("direction") || "horizontal";
    this.basePath = this.getAttribute("base-path") || ".";
    const pagesPerView = this.hasAttribute("pages-per-view")
      ? parseInt(this.getAttribute("pages-per-view"))
      : 2;

    this.index = 0;
    this.images = [];
    let gridCols = Math.ceil(Math.sqrt(pagesPerView));
    let gridRows = gridCols;
    if (pagesPerView === 2) {
      gridCols = 2;
      gridRows = 1;
    }

    const style = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
      }
      .scroll-container, .viewer {
        display: grid;
        width: 100%;
        ${direction === "horizontal" ? "height: 100%;" : ""}
        box-sizing: border-box;
        gap: 0;
        grid-template-columns: repeat(${gridCols}, minmax(0, 1fr));
        ${direction === "horizontal" ? `grid-template-rows: repeat(${gridRows}, minmax(0, 1fr));` : ""}
      }
      .scroll-container img, .viewer img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        background: ${bg};
        display: block;
        pointer-events: none;
        user-select: none;
      }
      .scroll-indicator {
        display: none;
      }
      button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        padding: 0.75rem 1.25rem;
        cursor: pointer;
        font-size: 2rem;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 1;
      }

      button#prev { left: 0.5rem; }
      button#next { right: 0.5rem; }
      button#prev,
      button#next {
        opacity: 1;
        transition: opacity 0.4s ease;
      }
    `;

    const imageExists = async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        return res.ok;
      } catch {
        return false;
      }
    };

    const preloadImages = async () => {
      const tempImages = [];
      let i = 0;
      while (true) {
        const num = String(i).padStart(3, "0");
        const src = `${this.basePath}/page-${num}.webp`;
        if (await imageExists(src)) {
          tempImages.push(src);
          i++;
        } else {
          break;
        }
      }
      const getIndex = (s) => {
        const match = s.match(/page-(\d+)\.webp$/);
        return match ? parseInt(match[1], 10) : -1;
      };
      this.images = tempImages.sort((a, b) => getIndex(a) - getIndex(b));
    };

    preloadImages().then(() => {
      this.shadowRoot.innerHTML = `<style>${style}</style>`;

      const setupLazyImage = (img, src) => {
        img.loading = "lazy";
        img.dataset.src = src;
        this._observer.observe(img);
      };

      this._observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              this._observer.unobserve(img);
            }
          });
        },
        { root: null, rootMargin: "100px" },
      );

      if (direction === "vertical") {
        const scrollContainer = document.createElement("div");
        scrollContainer.className = "scroll-container";
        this.shadowRoot.appendChild(scrollContainer);

        this.images.forEach((src, i) => {
          const img = document.createElement("img");
          img.alt = `page ${i}`;
          setupLazyImage(img, src);
          scrollContainer.appendChild(img);
        });

        requestAnimationFrame(() => {
          scrollContainer.scrollTop = 0;
        });
      } else {
        this.shadowRoot.innerHTML += `
          <button id="prev"><slot name="prev">&#x2039;</slot></button>
          <div class="viewer"></div>
          <button id="next"><slot name="next">&#x203a;</slot></button>`;

        this.viewer = this.shadowRoot.querySelector(".viewer");
        this.prevBtn = this.shadowRoot.querySelector("#prev");
        this.nextBtn = this.shadowRoot.querySelector("#next");

        // handle showing the first, and last page as 1up
        // but only in horizontal direction && when pagesPerView is 2
        this.handleFirstLastSinglePrev = () => {
          if (this.firstLastSingle && this.pagesPerView === 2) {
            if (this.index === 1) {
              this.show(0);
              return true;
            } else if (this.index === this.images.length - 1) {
              this.show(this.index - 2);
              return true;
            } else if (
              this.index === this.images.length - 2 &&
              this.images.length % 2 === 1
            ) {
              // odd number of pagez show last 2up
              this.show(this.index - 2);
              return true;
            }
          }
          return false;
        };
        this.handleFirstLastSingleNext = () => {
          if (this.firstLastSingle && this.pagesPerView === 2) {
            if (this.index === 0) {
              this.show(1);
              return true;
            } else if (this.index === this.images.length - 2) {
              // odd number of pagez, show last 2up
              if (this.images.length % 2 === 1) {
                this.show(this.images.length - 2);
                return true;
              } else {
                this.show(this.images.length - 1);
                return true;
              }
            }
          }
          return false;
        };

        this.prevBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!this.handleFirstLastSinglePrev()) {
            this.show(this.index - this.pagesPerView);
          }
        });

        this.nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!this.handleFirstLastSingleNext()) {
            this.show(this.index + this.pagesPerView);
          }
        });
        window.addEventListener("keydown", this.keyHandler);

        this.pagesPerView = pagesPerView;
        this.show(0);

        let lastScrollTime = 0;
        const SCROLL_COOLDOWN = 500;
        this.addEventListener(
          "wheel",
          (e) => {
            const now = Date.now();
            if (now - lastScrollTime < SCROLL_COOLDOWN) return;

            const combined = Math.abs(e.deltaX) + Math.abs(e.deltaY);
            if (combined > 30) {
              e.preventDefault();
              lastScrollTime = now;
              if (e.deltaX > 0 || e.deltaY > 0) {
                if (!this.handleFirstLastSingleNext()) {
                  this.show(this.index + this.pagesPerView);
                }
              } else {
                if (!this.handleFirstLastSinglePrev()) {
                  this.show(this.index - this.pagesPerView);
                }
              }
            }
          },
          { passive: false },
        );

        let startX = null;

        const handleSwipeStart = (x) => {
          startX = x;
        };

        const handleSwipeEnd = (x) => {
          if (startX === null) return;
          const dx = x - startX;
          if (Math.abs(dx) > 50) {
            this._clickSuppressed = true;
            if (dx < 0) {
              if (!this.handleFirstLastSingleNext()) {
                this.show(this.index + this.pagesPerView);
              }
            } else {
              if (!this.handleFirstLastSinglePrev()) {
                this.show(this.index - this.pagesPerView);
              }
            }
          } else {
            this._clickSuppressed = false;
          }
          startX = null;
        };

        this.addEventListener("pointerdown", (e) =>
          handleSwipeStart(e.clientX),
        );
        this.addEventListener("pointerup", (e) => handleSwipeEnd(e.clientX));

        this.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches.length === 1) {
              handleSwipeStart(e.touches[0].clientX);
            }
          },
          { passive: true },
        );

        this.addEventListener("touchend", (e) => {
          if (e.changedTouches.length === 1) {
            handleSwipeEnd(e.changedTouches[0].clientX);
          }
        });

        let navButtonTimeout = null;

        const resetViewerButtonVisibility = () => {
          const buttons = this.shadowRoot.querySelectorAll(
            "button#prev, button#next",
          );
          buttons.forEach((btn) => {
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
          });
          if (navButtonTimeout) clearTimeout(navButtonTimeout);
          navButtonTimeout = setTimeout(() => {
            buttons.forEach((btn) => {
              btn.style.opacity = "0";
              btn.style.pointerEvents = "none";
            });
          }, this.NAV_BUTTON_HIDE_AFTER_MS);
        };

        this.addEventListener("mousemove", resetViewerButtonVisibility);
        this.addEventListener("touchstart", resetViewerButtonVisibility);
        resetViewerButtonVisibility();
      }

      this.addEventListener("click", (e) => {
        if (this._clickSuppressed) return;

        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
          if (!this.handleFirstLastSinglePrev()) {
            this.show(this.index - this.pagesPerView);
          }
        } else {
          if (!this.handleFirstLastSingleNext()) {
            this.show(this.index + this.pagesPerView);
          }
        }
      });

      window.addEventListener(
        "wheel",
        (e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
          }
        },
        { passive: false },
      );
    });
  }

  show(i) {
    if (!this.images.length) return;

    // special navigation for firstLastSingle mode
    if (this.firstLastSingle && this.pagesPerView === 2) {
      if (this.index === 0 && i > 0) {
        i = 1;
      }

      // special case: navigating backward from a late page to the last page
      if (i >= this.images.length - 1 && this.index < this.images.length - 1) {
        i = this.images.length - 1; // Position at exact last page
      }
    }

    if (i < 0) {
      if (this.loop) i = Math.max(0, this.images.length - this.pagesPerView);
      else return;
    }
    if (i >= this.images.length) {
      if (this.loop) i = 0;
      else return;
    }

    this.index = i;

    this.updateButtonVisibility();

    if (this.viewer) {
      this.viewer.innerHTML = "";

      let pagesToShow = this.pagesPerView;

      const isFirstPage = i === 0;
      const isLastPage =
        i === this.images.length - 1 ||
        (i === this.images.length - 2 &&
          this.pagesPerView === 2 &&
          this.images.length % 2 === 0);

      // do firstLastSingle logic if enabled
      if (
        this.firstLastSingle &&
        this.pagesPerView === 2 &&
        (isFirstPage || isLastPage)
      ) {
        pagesToShow = 1;
        // need to update the grid layout for single page view
        // and i guess center it, too
        this.viewer.style.gridTemplateColumns = "1fr";
        this.viewer.style.justifyItems = "center";
      } else if (this.pagesPerView === 2) {
        // reset to two-column grid when not on first/last page
        this.viewer.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
        this.viewer.style.justifyItems = "stretch";
      }

      for (let j = 0; j < pagesToShow; j++) {
        const idx = this.index + j;
        if (idx < this.images.length) {
          const img = document.createElement("img");
          img.alt = `page ${idx}`;
          img.loading = "lazy";
          img.dataset.src = this.images[idx];
          this._observer.observe(img);
          this.viewer.appendChild(img);
        }
      }
    }
  }

  updateButtonVisibility() {
    if (!this.prevBtn || !this.nextBtn) return;

    if (this.loop) {
      this.prevBtn.style.display = "block";
      this.nextBtn.style.display = "block";
      return;
    }

    // check if prev available
    const canGoPrev = this.index > 0;
    this.prevBtn.style.display = canGoPrev ? "block" : "none";

    // check if next available
    let canGoNext = false;
    if (this.firstLastSingle && this.pagesPerView === 2) {
      // first-last-single mode logic
      if (this.index === 0) {
        canGoNext = this.images.length > 1;
      } else if (this.index === this.images.length - 1) {
        canGoNext = false;
      } else if (
        this.index === this.images.length - 2 &&
        this.images.length % 2 === 1
      ) {
        // last two pages together for odd total
        canGoNext = false;
      } else if (this.index === this.images.length - 2) {
        canGoNext = true; // can go to last single page
      } else {
        canGoNext = this.index + this.pagesPerView < this.images.length;
      }
    } else {
      canGoNext = this.index + this.pagesPerView < this.images.length;
    }

    this.nextBtn.style.display = canGoNext ? "block" : "none";
  }

  keyHandler = (e) => {
    if (e.key === "ArrowLeft") {
      if (!this.handleFirstLastSinglePrev()) {
        this.show(this.index - this.pagesPerView);
      }
    } else if (e.key === "ArrowRight") {
      if (!this.handleFirstLastSingleNext()) {
        this.show(this.index + this.pagesPerView);
      }
    }
  };
}

customElements.define("pee-dee-eff", PeeDeeEff);
