// Detects the user's ISO country code (for phone dial-code prefix).
// Caches per-session and in localStorage; times out fast and falls back to India (IN).
let cached;

export function detectCountry() {
  if (cached) return cached;
  const stored = localStorage.getItem("mc_country");
  if (stored && /^[A-Z]{2}$/.test(stored)) {
    cached = Promise.resolve(stored);
    return cached;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  cached = fetch("https://ipapi.co/country/", { signal: ctrl.signal })
    .then((r) => (r.ok ? r.text() : "IN"))
    .then((c) => {
      const code = (c || "").trim().toUpperCase();
      const valid = /^[A-Z]{2}$/.test(code) ? code : "IN";
      localStorage.setItem("mc_country", valid);
      return valid;
    })
    .catch(() => "IN")
    .finally(() => clearTimeout(timer));
  return cached;
}
