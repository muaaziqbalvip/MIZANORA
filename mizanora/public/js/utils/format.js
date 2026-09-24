// MIZANORA — shared formatting helpers

export function formatPKR(amount) {
  if (amount == null || isNaN(amount)) return "Rs. 0";
  return "Rs. " + Math.round(amount).toLocaleString("en-PK");
}

export function discountPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Scroll-reveal: adds .is-visible to .mz-reveal elements as they enter viewport. */
export function initScrollReveal() {
  const els = document.querySelectorAll(".mz-reveal");
  if (!("IntersectionObserver" in window) || els.length === 0) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

export function starRow(rating = 0) {
  const full = Math.round(rating);
  return Array.from({ length: 5 })
    .map((_, i) => (i < full ? "★" : "☆"))
    .join("");
}
