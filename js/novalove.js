/* Keep purchase and reading links usable without JavaScript. */
(() => {
  const track = (name, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  };
  const isExcerpt = document.body.classList.contains("reader-page");
  const readingPreferences = document.querySelector(
    "[data-reader-preferences]",
  );
  if (isExcerpt && readingPreferences) {
    const storageKey = "novalove-reading-font";
    const fontNames = {
      lora: "Lora",
      georgia: "Georgia",
      "open-sans": "Open Sans",
    };
    const fontOptions = readingPreferences.querySelectorAll(
      'input[name="reading-font"]',
    );
    const fontStatus = readingPreferences.querySelector(
      "[data-reader-font-status]",
    );
    const applyReadingFont = (font, remember = false) => {
      if (!Object.prototype.hasOwnProperty.call(fontNames, font)) return;
      document.body.dataset.readingFont = font;
      fontOptions.forEach((option) => {
        option.checked = option.value === font;
      });
      let saved = false;
      if (remember) {
        try {
          window.localStorage.setItem(storageKey, font);
          saved = true;
        } catch {
          /* Reading controls still work when local storage is unavailable. */
        }
      }
      fontStatus.textContent = `${fontNames[font]} sélectionnée.${saved ? " Choix mémorisé sur cet appareil." : ""}`;
    };
    let initialFont = "lora";
    try {
      const savedFont = window.localStorage.getItem(storageKey);
      if (Object.prototype.hasOwnProperty.call(fontNames, savedFont))
        initialFont = savedFont;
    } catch {
      /* Use the default font when storage is blocked. */
    }
    applyReadingFont(initialFont);
    fontOptions.forEach((option) => {
      option.addEventListener("change", () => {
        if (option.checked) applyReadingFont(option.value, true);
      });
    });
    readingPreferences.hidden = false;
  }
  document.querySelectorAll("[data-cta]").forEach((link) => {
    link.addEventListener("click", () => {
      track(isExcerpt ? "click_cta_extrait" : "click_cta", {
        event_label: link.dataset.cta,
      });
    });
  });
  const sticky = document.querySelector("[data-sticky-bar]");
  const hero = document.querySelector("[data-sticky-hero]");
  const end = document.querySelector("[data-sticky-end]");
  if (sticky && hero && end && "IntersectionObserver" in window) {
    let pastHero = false;
    let endVisible = false;
    const update = () => {
      sticky.hidden = !pastHero || endVisible;
    };
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          pastHero = entry.boundingClientRect.bottom <= 0;
          update();
        }
      },
      { threshold: 0 },
    ).observe(hero);
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          endVisible = entry.isIntersecting;
          update();
        }
      },
      { threshold: 0 },
    ).observe(end);
  }
  const fired = new Set();
  window.addEventListener(
    "scroll",
    () => {
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      if (distance <= 0) return;
      const percent = Math.min(
        100,
        Math.round((window.scrollY / distance) * 100),
      );
      [25, 50, 75, 90, 100].forEach((milestone) => {
        if (percent >= milestone && !fired.has(milestone)) {
          fired.add(milestone);
          track(isExcerpt ? "scroll_depth_extrait" : "scroll_depth", {
            event_label: String(milestone),
            value: milestone,
          });
        }
      });
    },
    { passive: true },
  );
  [30, 60].forEach((seconds) =>
    setTimeout(() => {
      track(isExcerpt ? "time_on_page_extrait" : "time_on_page", {
        event_label: `${seconds}s`,
      });
    }, seconds * 1000),
  );
})();
