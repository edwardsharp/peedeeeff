class PeeDeeEff extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.images = [];
    this.index = 0;
    this.SCROLL_HIDE_THRESHOLD = 150;
    this._clickSuppressed = false;
    this._observer = null;
  }

  connectedCallback() {
    const bg = this.getAttribute("background") || "white";
    this.loop = this.getAttribute("loop") === "true";
    this.firstLastSingle = this.getAttribute("1up-first-and-last") === "true";
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

        this.prevBtn.addEventListener("click", () =>
          this.show(this.index - pagesPerView),
        );
        this.nextBtn.addEventListener("click", () =>
          this.show(this.index + pagesPerView),
        );
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
                this.show(this.index + this.pagesPerView);
              } else {
                this.show(this.index - this.pagesPerView);
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
            if (dx < 0) this.show(this.index + this.pagesPerView);
            else this.show(this.index - this.pagesPerView);
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
          }, 1234);
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
          this.show(this.index - this.pagesPerView);
        } else {
          this.show(this.index + this.pagesPerView);
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

    if (i < 0) {
      if (this.loop) i = Math.max(0, this.images.length - this.pagesPerView);
      else return;
    }
    if (i >= this.images.length) {
      if (this.loop) i = 0;
      else return;
    }

    this.index = i;

    if (this.viewer) {
      this.viewer.innerHTML = "";
      for (let j = 0; j < this.pagesPerView; j++) {
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

  keyHandler = (e) => {
    if (e.key === "ArrowLeft") this.show(this.index - this.pagesPerView);
    else if (e.key === "ArrowRight") this.show(this.index + this.pagesPerView);
  };
}

customElements.define("pee-dee-eff", PeeDeeEff);
