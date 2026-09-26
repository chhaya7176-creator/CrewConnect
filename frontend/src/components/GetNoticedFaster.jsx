import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Gift, Users, Share2, CheckCircle2, IndianRupee, Building2 } from "lucide-react";

const GROUP_TARGET = 2;
const CONTACT_TARGET = 20;

export const GetNoticedFaster = ({ referralCode, onUnlocked }) => {
  const [elig, setElig] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/?ref=${referralCode || ""}`;

  const load = () => api.get("/eligibility").then((r) => setElig(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (elig?.eligible) api.get("/promoted-companies").then((r) => setCompanies(r.data.companies || [])).catch(() => {});
  }, [elig?.eligible]);

  const claimIfReady = async (s) => {
    if ((s.group_shares || 0) >= GROUP_TARGET || (s.contact_shares || 0) >= CONTACT_TARGET) {
      try {
        await api.post("/referral/claim");
        toast.success("Unlocked! Your profile is now promoted 🎉");
        load();
        onUnlocked?.();
      } catch { /* not enough yet */ }
    }
  };

  const share = async (type) => {
    let s = elig;
    try { const r = await api.post("/referral/share", { type }); s = r.data; setElig((e) => ({ ...(e || {}), ...r.data })); } catch { /* ignore */ }
    const text = `Join me on Smart Crewing — get matched with shipping jobs fast! ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    claimIfReady(s);
  };

  const pay = async () => {
    setBusy(true);
    try {
      await api.post("/get-noticed/pay");
      toast.success("Boosted! You're now promoted (₹499 — demo)");
      load();
      onUnlocked?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Payment failed");
    } finally { setBusy(false); }
  };

  if (!elig) return null;
  const g = elig.group_shares || 0, c = elig.contact_shares || 0;

  if (elig.eligible) {
    return (
      <div className="rounded-2xl border border-[#25D366]/40 bg-[#25D366]/5 p-5" data-testid="get-noticed-active">
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="w-5 h-5 text-[#25D366]" />
          <h3 className="font-heading font-extrabold text-lg text-[#25D366]">Get Noticed Faster is active</h3>
          <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
        </div>
        <p className="text-sm text-[#8A8F9E] mb-4">Your profile is being actively sent to companies seeking your experience. Companies your profile has been shared with:</p>
        {companies.length ? (
          <div className="space-y-2" data-testid="promoted-companies">
            {companies.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 px-3 py-2" data-testid="promoted-company">
                <Building2 className="w-4 h-4 text-[#0066FF] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.company_name}</div>
                  <div className="text-[11px] text-[#8A8F9E]">{p.rank} · {p.vessel_type}</div>
                </div>
                {p.shared_at && <span className="text-[10px] text-[#8A8F9E] font-data shrink-0">{String(p.shared_at).slice(0, 10)}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#8A8F9E]">No matching companies yet — we'll keep sharing your profile as new vacancies arrive.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#0066FF]/40 bg-gradient-to-br from-[#0066FF]/10 to-transparent p-5 sm:p-6" data-testid="get-noticed-faster">
      <div className="flex items-center gap-2 mb-2">
        <Rocket className="w-5 h-5 text-[#FF5A00]" />
        <h3 className="font-heading font-extrabold text-xl text-white">Get noticed faster</h3>
      </div>
      <p className="text-sm text-[#E7EAF0] leading-relaxed mb-5">
        Unlock to <b className="text-white">(a)</b> have your profile <b className="text-white">actively sent to the WhatsApp &amp; email of companies</b> seeking your experience, and <b className="text-white">(b) see which companies</b> your profile has been shared with.
      </p>

      {/* Option 1 — Pay */}
      <div className="rounded-xl border border-white/10 bg-black/20 p-4" data-testid="gnf-pay-section">
        <div className="text-sm font-semibold mb-1 text-white">Boost profile</div>
        <p className="text-xs text-[#C9CFDA] mb-3">Prefer not to share? Pay once to unlock instantly.</p>
        <Button variant="outline" className="w-full rounded-full border-white/15 bg-transparent hover:bg-white/5 gap-2" disabled={busy} onClick={pay} data-testid="gnf-pay-btn">
          <IndianRupee className="w-4 h-4" /> {busy ? "Processing..." : "Boost for ₹499"}
        </Button>
      </div>

      {/* OR — prominent, pulsing */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-white/15" />
        <span className="or-pulse text-sm font-extrabold text-black bg-[#DFFF00] rounded-full px-4 py-1 tracking-[0.2em]">OR</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>

      {/* Option 2 — Share (prominent, pulsing) */}
      <div className="pulse-cta rounded-xl border-2 border-[#25D366]/70 bg-[#25D366]/10 p-4" data-testid="gnf-share-section">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Gift className="w-5 h-5 text-[#25D366]" />
          <span className="font-heading font-extrabold text-lg text-[#25D366]">Simply Share to get noticed faster</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DFFF00] text-black font-bold">RECOMMENDED</span>
        </div>
        <p className="text-xs text-[#C9CFDA] mb-3">Share your link with <b className="text-white">{GROUP_TARGET} WhatsApp shipping groups</b> OR <b className="text-white">{CONTACT_TARGET} contacts</b> — auto-unlocks when you hit the target.</p>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 text-center rounded-lg bg-black/30 border border-white/10 py-2"><div className="font-data text-lg">{g}/{GROUP_TARGET}</div><div className="text-[10px] text-[#8A8F9E]">Groups</div></div>
          <div className="flex-1 text-center rounded-lg bg-black/30 border border-white/10 py-2"><div className="font-data text-lg">{c}/{CONTACT_TARGET}</div><div className="text-[10px] text-[#8A8F9E]">Contacts</div></div>
        </div>
        <Input readOnly value={link} className="bg-black/40 border-white/10 font-data text-xs mb-3" data-testid="gnf-referral-link" />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-1 rounded-full" onClick={() => share("group")} data-testid="gnf-share-group-btn"><Users className="w-3.5 h-3.5" /> Share to group</Button>
          <Button size="sm" variant="outline" className="flex-1 border-[#25D366]/40 bg-transparent hover:bg-[#25D366]/10 text-[#25D366] gap-1 rounded-full" onClick={() => share("contact")} data-testid="gnf-share-contact-btn"><Share2 className="w-3.5 h-3.5" /> Send to contact</Button>
        </div>
      </div>
    </div>
  );
};
