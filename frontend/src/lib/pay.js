import { api } from "@/lib/api";

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Runs a payment for a purpose. In mock mode (no Razorpay keys) it completes instantly;
// with keys it opens Razorpay Checkout (UPI/cards) and verifies the signature server-side.
export async function payFor(purpose, { seeker_id } = {}) {
  const { data: order } = await api.post("/pay/create-order", { purpose, seeker_id });
  if (order.mock) {
    const { data } = await api.post("/pay/verify", { order_id: order.order_id, purpose, seeker_id });
    return data;
  }
  const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!ok) throw new Error("Could not load Razorpay checkout");
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      order_id: order.order_id,
      name: "Smart Crewing",
      description: purpose === "subscription" ? "Annual plan (₹1,99,000)" : "Unlock crew contact (₹29)",
      prefill: order.prefill,
      theme: { color: "#FF5A00" },
      handler: async (resp) => {
        try {
          const { data } = await api.post("/pay/verify", {
            order_id: order.order_id, purpose, seeker_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve(data);
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
