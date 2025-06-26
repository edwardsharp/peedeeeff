class PeeDeeEff extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.images = [];
    this.index = 0;
    this.SCROLL_HIDE_THRESHOLD = 150;
    this._clickSuppressed = false; // track if swipe occurred to suppress click
  }

  connectedCallback() {
    const bg = this.getAttribute("background") || "white";
    this.loop = this.getAttribute("loop") === "true";
    this.firstLastSingle = this.getAttribute("1up-first-and-last") === "true";
    const direction = this.getAttribute("direction") || "horizontal";
    const basePath = this.getAttribute("base-path") || ".";
    const pagesPerView = this.hasAttribute("pages-per-view")
      ? parseInt(this.getAttribute("pages-per-view"))
      : 2;
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
        height: 100%;
        box-sizing: border-box;
        gap: 0;
        grid-template-columns: repeat(${gridCols}, minmax(0, 1fr));
        grid-template-rows: repeat(${gridRows}, minmax(0, 1fr));
      }
      .scroll-container img, .viewer img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
        background: ${bg};
        display: block;
        pointer-events: none; /* Prevent images from capturing pointer events */
        user-select: none;     /* Prevent drag selection */
      }
      .scroll-indicator {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        animation: bounce 1.2s infinite;
        pointer-events: none;
        z-index: 10;
        transition: opacity 0.4s ease;
        opacity: 1;
      }
      .scroll-indicator.hidden {
        opacity: 0;
        pointer-events: none;
      }
      @keyframes bounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-6px); }
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
      :host(:hover) button {
        opacity: 1;
      }
      button#prev { left: 0.5rem; }
      button#next { right: 0.5rem; }
    `;

    const tryLoadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(src);
        img.onerror = () => reject(src);
      });

    const preloadImages = async () => {
      let i = 0;
      while (true) {
        const num = String(i).padStart(3, "0");
        const src = `${basePath}/page-${num}.webp`;
        try {
          await tryLoadImage(src);
          this.images.push(src);
          i++;
        } catch {
          break;
        }
      }
    };

    preloadImages().then(() => {
      this.shadowRoot.innerHTML = `<style>${style}</style>`;

      if (direction === "vertical") {
        const scrollContainer = document.createElement("div");
        scrollContainer.className = "scroll-container";
        this.shadowRoot.appendChild(scrollContainer);

        const slotWrapper = document.createElement("div");
        slotWrapper.className = "scroll-indicator";
        slotWrapper.id = "scrollHint";
        slotWrapper.innerHTML =
          '<slot name="scroll-message">scroll down!</slot>';
        this.shadowRoot.appendChild(slotWrapper);

        this.images.forEach((src, i) => {
          const img = document.createElement("img");
          img.dataset.src = src;
          img.alt = `page ${i}`;
          img.loading = "lazy";
          scrollContainer.appendChild(img);
        });

        const lazyObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.target.dataset.src) {
                entry.target.src = entry.target.dataset.src;
                entry.target.removeAttribute("data-src");
                lazyObserver.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "200px" },
        );

        scrollContainer
          .querySelectorAll("img")
          .forEach((img) => lazyObserver.observe(img));

        const firstImage = scrollContainer.querySelector("img");
        if (firstImage) {
          firstImage.addEventListener("load", () => {
            const hideHint = () => {
              this.shadowRoot
                .getElementById("scrollHint")
                ?.classList.add("hidden");
              this.removeEventListener("scroll", hideHint);
            };
            this.addEventListener(
              "scroll",
              () => {
                if (this.scrollTop > this.SCROLL_HIDE_THRESHOLD) hideHint();
              },
              { passive: true },
            );
          });
        }
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

        // Horizontal scroll gesture support + desktop swipe detection
        let lastScrollTime = 0;
        const SCROLL_COOLDOWN = 500; // ms
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

        // Crude swipe support + click fallback
        let startX = null;
        this.addEventListener("pointerdown", (e) => {
          startX = e.clientX;
        });
        this.addEventListener("pointerup", (e) => {
          if (startX === null) return;
          const dx = e.clientX - startX;
          if (Math.abs(dx) > 50) {
            this._clickSuppressed = true;
            if (dx < 0) this.show(this.index + this.pagesPerView);
            else this.show(this.index - this.pagesPerView);
          } else {
            this._clickSuppressed = false;
          }
          startX = null;
        });

        // Click-to-advance support
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

        // be aggressive about preventing overscroll.
        window.addEventListener(
          "wheel",
          (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
              e.preventDefault(); // block overscroll
            }
          },
          { passive: false },
        );
      }
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
          img.src = this.images[idx];
          img.alt = `page ${idx}`;
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
