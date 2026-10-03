import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { payFor } from "@/lib/pay";
import { Crown, Megaphone, IndianRupee } from "lucide-react";

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
    <div className="rounded-2xl border border-white/10 bg-[#0A0B12] p-5 sm:p-6 mb-6" data-testid="company-plan-upgrade">
      {/* Hero: pay-per-CV is the headline offer */}
      <div className="rounded-xl border-2 border-[#FF5A00]/60 bg-gradient-to-br from-[#FF5A00]/20 to-transparent p-5" data-testid="per-cv-highlight">
        <div className="flex items-center gap-2 mb-1.5">
          <IndianRupee className="w-6 h-6 text-[#FF7A2E]" />
          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">Just ₹29 per CV / contact</h3>
        </div>
        <p className="text-base font-bold text-[#FFB38A]" data-testid="per-cv-tagline">
          Your first 5 contact unlocks are FREE — then only ₹29 per profile.
        </p>
      </div>

      {/* Understated optional annual plan */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
        <div className="text-xs text-[#8A8F9E] leading-relaxed">
          <span className="text-[#C9CFDA]">Optional annual plan</span> · 20 Standard CV downloads/day · featured home-page banner
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-transparent text-[#8A8F9E] hover:text-white hover:bg-white/5 h-8 px-3 text-xs"
          disabled={busy}
          onClick={subscribe}
          data-testid="subscribe-btn"
        >
          {busy ? "Processing..." : "Annual plan · ₹1,99,000/yr"}
        </Button>
      </div>
    </div>
  );
};
