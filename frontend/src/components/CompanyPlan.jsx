import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { payFor } from "@/lib/pay";
import { Crown, Check, Megaphone } from "lucide-react";

export const CompanyPlan = () => {
  const [st, setSt] = useState(null);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get("/company/status").then((r) => {
      setSt(r.data);
      if (r.data.banner) { setTitle(r.data.banner.title || ""); setTagline(r.data.banner.tagline || ""); }
    }).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!st) return null;

  const subscribe = async () => {
    setBusy(true);
    try { await payFor("subscription"); toast.success("Annual plan active 🎉"); load(); window.dispatchEvent(new Event("mc-status-changed")); }
    catch (e) { toast.error(e.message || "Payment cancelled"); }
    finally { setBusy(false); }
  };

  const saveBanner = async () => {
    try { await api.post("/company/banner", { title, tagline }); toast.success("Home-page banner saved"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Could not save banner"); }
  };

  if (st.subscribed) {
    return (
      <div className="rounded-2xl border border-[#DFFF00]/40 bg-[#DFFF00]/5 p-5 mb-6" data-testid="company-plan-active">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-5 h-5 text-[#DFFF00]" />
          <h3 className="font-heading font-extrabold text-lg text-white">Annual Plan active</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DFFF00] text-black font-bold">SUBSCRIBED</span>
        </div>
        <p className="text-sm text-[#C9CFDA] mb-4">
          Unlimited free contact unlocks · {st.downloads_today}/{st.download_limit} Standard CVs downloaded today · home-page banner live.
          {st.subscription_expiry ? ` Renews ${String(st.subscription_expiry).slice(0, 10)}.` : ""}
        </p>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-2 text-white font-semibold text-sm"><Megaphone className="w-4 h-4 text-[#FF5A00]" /> Your home-page banner</div>
          <Input className="bg-black/30 border-white/10 mb-2" placeholder="Banner title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="banner-title-input" />
          <Input className="bg-black/30 border-white/10 mb-3" placeholder="Tagline (optional)" value={tagline} onChange={(e) => setTagline(e.target.value)} data-testid="banner-tagline-input" />
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" onClick={saveBanner} disabled={!title} data-testid="save-banner-btn">Save banner</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#FF5A00]/40 bg-gradient-to-br from-[#FF5A00]/12 to-transparent p-5 sm:p-6 mb-6" data-testid="company-plan-upgrade">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-5 h-5 text-[#FF7A2E]" />
        <h3 className="font-heading font-extrabold text-xl text-white">Company Annual Plan — ₹1,99,000/yr</h3>
      </div>
      <ul className="text-sm text-[#E7EAF0] space-y-1.5 mb-4">
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Unlimited contact unlocks (no ₹29 per profile)</li>
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Download 20 CVs/day in one Standard format</li>
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#25D366]" /> Featured company banner on the home page</li>
      </ul>
      <p className="text-xs text-[#8A8F9E] mb-4">Otherwise: your first 5 contact unlocks are free, then ₹29 per profile.</p>
      <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" disabled={busy} onClick={subscribe} data-testid="subscribe-btn">
        {busy ? "Processing..." : "Subscribe — ₹1,99,000 / year"}
      </Button>
    </div>
  );
};
