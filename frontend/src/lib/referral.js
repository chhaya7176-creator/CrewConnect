// Captures a referral code from the URL (?ref=CODE) and persists it so a real
// sign-up completed later in the flow can be attributed to the referrer.
export function captureRef() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) localStorage.setItem("mc_ref", code);
  } catch {
    /* ignore */
  }
}

export function getRef() {
  return localStorage.getItem("mc_ref") || null;
}
