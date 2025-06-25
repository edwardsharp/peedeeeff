class PeeDeeEff extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.images = [];
    this.index = 0;
    this.SCROLL_HIDE_THRESHOLD = 150;
  }

  connectedCallback() {
    const bg = this.getAttribute("background") || "white";
    this.loop = this.getAttribute("loop") === "true";
    this.singleBoundary = this.getAttribute("single-boundary") === "true";
    this.oneAttaTime = this.getAttribute("one-atta-time") === "true";
    const scrollMode = this.getAttribute("scroll-mode") === "true";

    const basePath = this.getAttribute("base-path") || ".";
    const lastPage = parseInt(this.getAttribute("last-page"), 10);

    const style = `
          :host {
            display: block;
            width: 100%;
            height: 100%;
            overflow: ${scrollMode ? "auto" : "hidden"};
            position: relative;
          }
          img {
            background: ${bg};
          }
          .scroll-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 0;
            gap: 1rem;
          }
          .scroll-container img {
            width: 100%;
            height: auto;
            max-width: 100%;
            object-fit: contain;
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
          .viewer {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            gap: 1rem;
          }
          .viewer img {
            max-height: 100%;
            max-width: 50%;
            object-fit: contain;
            object-position: center;
            flex-shrink: 1;
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

    if (scrollMode && !isNaN(lastPage)) {
      for (let i = 0; i <= lastPage; i++) {
        const num = String(i).padStart(3, "0");
        this.images.push(`${basePath}/page-${num}.webp`);
      }

      const scrollContainer = document.createElement("div");
      scrollContainer.className = "scroll-container";
      scrollContainer.innerHTML = this.images
        .map(
          (src, i) =>
            `<img data-src="${src}" alt="page ${i}" loading="lazy" />`,
        )
        .join("");

      const wrapper = document.createElement("div");
      wrapper.appendChild(scrollContainer);

      this.shadowRoot.innerHTML = `<style>${style}</style>`;
      this.shadowRoot.appendChild(wrapper);

      const slotWrapper = document.createElement("div");
      slotWrapper.className = "scroll-indicator";
      slotWrapper.id = "scrollHint";
      slotWrapper.innerHTML = '<slot name="scroll-message">scroll down!</slot>';
      this.shadowRoot.appendChild(slotWrapper);

      const imgs = this.shadowRoot.querySelectorAll("img");
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
      imgs.forEach((img) => lazyObserver.observe(img));

      const firstImage = imgs[0];
      if (firstImage) {
        firstImage.addEventListener("load", () => {
          const hideHint = () => {
            this.shadowRoot
              .getElementById("scrollHint")
              ?.classList.add("hidden");
            this.removeEventListener("scroll", hideHint);
          };

          const scrollListener = () => {
            if (this.scrollTop > this.SCROLL_HIDE_THRESHOLD) {
              hideHint();
            }
          };
          this.addEventListener("scroll", scrollListener, { passive: true });
        });
      }
    } else if (this.getAttribute("horizontal-scroll-mode") === "true") {
      for (let i = 0; i <= lastPage; i++) {
        const num = String(i).padStart(3, "0");
        this.images.push(`${basePath}/page-${num}.webp`);
      }

      const hscroll = document.createElement("div");
      hscroll.className = "hscroll-container";

      let shouldShowRightImg = true;
      let indexIncrement = 2;
      if (this.oneAttaTime) {
        shouldShowRightImg = false;
        indexIncrement = 1;
      }
      for (let i = 0; i < this.images.length; i += indexIncrement) {
        const spread = document.createElement("div");
        spread.className = "spread";

        const img1 = document.createElement("img");
        img1.src = this.images[i];
        spread.appendChild(img1);

        if (shouldShowRightImg && this.images[i + 1]) {
          const img2 = document.createElement("img");
          img2.src = this.images[i + 1];
          spread.appendChild(img2);
        } else {
          img1.style.maxWidth = "100%";
        }

        hscroll.appendChild(spread);
      }

      this.shadowRoot.innerHTML = `<style>${style}
        .hscroll-container {
          display: flex;
          flex-direction: row;
          overflow-x: auto;
          height: 100%;
          width: 100%;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
        }
        .spread {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          min-width: 100%;
          gap: 1rem;
          scroll-snap-align: start;
        }
        .spread img {
          max-height: 100%;
          max-width: calc(50% - 1rem);
          object-fit: contain;
          background: ${bg};
        }`;

      this.shadowRoot.appendChild(hscroll);
    } else {
      this.shadowRoot.innerHTML = `<style>${style}</style>
            <button id="prev">&#x2039;</button>
            <div class="viewer">
              <img id="left" alt="left page" />
              <img id="right" alt="right page" />
            </div>
            <button id="next">&#x203a;</button>`;

      this.leftEl = this.shadowRoot.querySelector("#left");
      this.rightEl = this.shadowRoot.querySelector("#right");
      this.prevBtn = this.shadowRoot.querySelector("#prev");
      this.nextBtn = this.shadowRoot.querySelector("#next");

      const indexIncrement = this.oneAttaTime ? 1 : 2;
      this.prevBtn.addEventListener("click", () =>
        this.show(this.index - indexIncrement),
      );
      this.nextBtn.addEventListener("click", () =>
        this.show(this.index + indexIncrement),
      );
      window.addEventListener("keydown", this.keyHandler);

      for (let i = 0; i <= lastPage; i++) {
        const num = String(i).padStart(3, "0");
        this.images.push(`${basePath}/page-${num}.webp`);
      }
      this.show(0);
    }
  }

  show(i) {
    if (!this.images.length) return;

    if (i < 0) {
      if (this.loop)
        i = this.images.length - (this.images.length % 2 === 0 ? 2 : 1);
      else return;
    }
    if (i >= this.images.length) {
      if (this.loop) i = 0;
      else return;
    }

    this.index = i;

    if (this.oneAttaTime || (this.singleBoundary && this.index === 0)) {
      this.leftEl.src = this.images[this.index] || "";
      this.leftEl.style.maxWidth = "100%";
      this.rightEl.src = "";
      this.rightEl.style.display = "none";
      return;
    } else {
      this.leftEl.style.maxWidth = "50%";
    }

    if (this.singleBoundary && this.index === this.images.length - 1) {
      this.leftEl.src = this.images[this.index] || "";
      this.rightEl.src = "";
      this.rightEl.style.display = "none";
      return;
    }

    this.leftEl.src = this.images[this.index] || "";
    this.rightEl.src = this.images[this.index + 1] || "";
    this.rightEl.style.display =
      this.index + 1 < this.images.length ? "block" : "none";
  }

  keyHandler = (e) => {
    const indexIncrement = this.oneAttaTime ? 1 : 2;
    if (e.key === "ArrowLeft") this.show(this.index - indexIncrement);
    else if (e.key === "ArrowRight") this.show(this.index + indexIncrement);
  };
}

customElements.define("pee-dee-eff", PeeDeeEff);
