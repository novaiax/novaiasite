/* Keep purchase and reading links usable without JavaScript. */
(() => {
  const track = (name, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  };
  const isExcerpt = document.body.classList.contains("reader-page");
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
