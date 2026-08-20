import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Empty } from "@/pages/Dashboard";
import { Lock, Unlock, IndianRupee, Ship, Building2, Anchor, MessageCircle, Share2, Users, CheckCircle2, Gift } from "lucide-react";

const waLink = (mobile, text) => {
  const digits = String(mobile || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const Field = ({ label, value, tag }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-[#8A8F9E] flex items-center gap-1.5 flex-wrap">
      {label}
      {tag && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${tag === "Mandatory" ? "bg-[#ef4444]/15 text-[#ff6b6b] border-[#ef4444]/40" : "bg-[#DFFF00]/15 text-[#DFFF00] border-[#DFFF00]/40"}`}>
          {tag}
        </span>
      )}
    </div>
    <div className="text-sm font-data mt-0.5">{value}</div>
  </div>
);

const EligibilityGate = ({ referralCode, onEligible }) => {
  const [elig, setElig] = useState(null);
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/?ref=${referralCode || ""}`;

  const load = () => api.get("/eligibility").then((r) => setElig(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const share = async (type) => {
    try {
      await api.post("/referral/share", { type });
    } catch { /* ignore */ }
    const text = `Join me on Smart Crewing — find shipping jobs & crew fast! ${link}`;
    window.open(waLink("", text), "_blank");
    load();
  };

  const claim = async () => {
    setBusy(true);
    try {
      await api.post("/referral/claim");
      toast.success("Free access unlocked — thanks for sharing! 🎉");
      onEligible?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Share more to unlock");
      load();
    } finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true);
    try {
      await api.post("/register/pay");
      toast.success("Registered! (₹100 paid — demo)");
      onEligible?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Payment failed");
    } finally { setBusy(false); }
  };

  if (!elig) return null;
  const g = elig.group_shares, c = elig.contact_shares;
  const canClaim = g >= 2 || c >= 10;

  return (
    <div className="rounded-2xl border border-[#0066FF]/40 bg-gradient-to-br from-[#0066FF]/10 to-transparent p-5 sm:p-6 mb-6" data-testid="eligibility-gate">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-[#FF5A00]" />
        <h3 className="font-heading font-extrabold text-lg">Unlock company names & contacts</h3>
      </div>
      <p className="text-sm text-[#8A8F9E] mb-5">
        You can browse all matching vacancies free. To reveal <b>company name & contact details</b>, either share Smart Crewing or pay a one-time registration.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Referral — highlighted */}
        <div className="rounded-xl border-2 border-[#25D366]/60 bg-[#25D366]/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-[#25D366]" />
            <span className="font-semibold text-sm text-[#25D366]">Share &amp; unlock — FREE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DFFF00] text-black font-bold">RECOMMENDED</span>
          </div>
          <p className="text-xs text-[#8A8F9E] mb-3">Share with <b>2 WhatsApp groups</b> or <b>10 contacts</b>.</p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 text-center rounded-lg bg-black/30 border border-white/10 py-2">
              <div className="font-data text-lg">{g}/2</div>
              <div className="text-[10px] text-[#8A8F9E]">Groups</div>
            </div>
            <div className="flex-1 text-center rounded-lg bg-black/30 border border-white/10 py-2">
              <div className="font-data text-lg">{c}/10</div>
              <div className="text-[10px] text-[#8A8F9E]">Contacts</div>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Button size="sm" className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-1 rounded-full" onClick={() => share("group")} data-testid="share-group-btn">
              <Users className="w-3.5 h-3.5" /> Share to group
            </Button>
            <Button size="sm" variant="outline" className="flex-1 border-[#25D366]/40 bg-transparent hover:bg-[#25D366]/10 text-[#25D366] gap-1 rounded-full" onClick={() => share("contact")} data-testid="share-contact-btn">
              <Share2 className="w-3.5 h-3.5" /> Send to contact
            </Button>
          </div>
          <Button className="w-full rounded-full gap-2 bg-[#FF5A00] hover:bg-[#E04F00] disabled:opacity-40" disabled={!canClaim || busy} onClick={claim} data-testid="claim-free-btn">
            <CheckCircle2 className="w-4 h-4" /> {canClaim ? "Claim free access" : "Share more to unlock"}
          </Button>
        </div>

        {/* Paid registration — struck through */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 flex flex-col">
          <div className="text-sm font-semibold mb-2">One-time registration</div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-heading font-extrabold text-[#8A8F9E] line-through decoration-[#ef4444] decoration-2">₹100</span>
            <span className="text-sm text-[#DFFF00] font-semibold">Skip with a free share →</span>
          </div>
          <p className="text-xs text-[#8A8F9E] mb-4 flex-1">Prefer not to share? Pay once to unlock all company contacts.</p>
          <Button variant="outline" className="w-full rounded-full border-white/15 bg-transparent hover:bg-white/5 gap-2" disabled={busy} onClick={pay} data-testid="pay-register-btn">
            <IndianRupee className="w-4 h-4" /> Pay ₹100 &amp; register
          </Button>
        </div>
      </div>
    </div>
  );
};

export const Matches = () => {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/matches").then((r) => setRes(r.data)).catch(() => setRes({ role: null, matches: [] }));
  useEffect(() => { load(); }, []);

  const unlock = async (id) => {
    setBusy(id);
    try {
      await api.post("/unlock-cv", { seeker_id: id });
      toast.success("CV unlocked! (₹49 paid — demo)");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Unlock failed");
    } finally {
      setBusy(null);
    }
  };

  if (!res) return <Empty text="Loading matches..." />;
  if (!res.role) return <Empty text="Complete a profile or requirement in the chat to see your matches." />;

  // Provider view — candidate CVs with locked identity/contact
  if (res.role === "provider") {
    if (!res.matches.length) return <Empty text="No matching candidates yet. Check back soon — new crew join daily." />;
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="matches-provider">
        {res.matches.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-5 flex flex-col" data-testid={`match-card-${c.id}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center">
                  <Anchor className="w-4 h-4 text-[#FF5A00]" />
                </div>
                <div className="font-heading font-bold">{c.rank}</div>
              </div>
              {c.boosted && <Badge className="bg-[#DFFF00] text-black text-[10px]">BOOSTED</Badge>}
            </div>

            {c.summary && <p className="text-xs text-[#8A8F9E] mb-4">{c.summary}</p>}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Vessel" value={c.vessel_type} />
              <Field label="Sea time" value={c.sea_time} />
              <Field label="COC" value={c.coc} />
              <Field label="US Visa" value={c.us_visa} />
              <Field label="Available" value={c.availability} />
            </div>

            <div className={`rounded-lg border p-3 mb-1 relative ${c.unlocked ? "border-[#25D366]/40 bg-[#25D366]/5" : "border-white/10 bg-black/30"}`}>
              {!c.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-lg">
                  <Lock className="w-5 h-5 text-[#FF5A00]" />
                </div>
              )}
              <div className={!c.unlocked ? "blur-[3px] select-none" : ""}>
                <Field label="Name" value={c.name} />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="Mobile" value={c.mobile} />
                  <Field label="Email" value={c.email} />
                </div>
              </div>
            </div>
            {!c.unlocked && <p className="text-[10px] text-[#8A8F9E] mb-3 mt-1.5">Name, contact, INDOS, CDC, passport &amp; photo hidden until unlocked</p>}
            {c.unlocked && <div className="mb-3" />}

            {c.unlocked ? (
              <div className="flex gap-2">
                <Button disabled className="flex-1 bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 gap-2 rounded-full" data-testid={`unlocked-${c.id}`}>
                  <Unlock className="w-4 h-4" /> Unlocked
                </Button>
                <Button
                  className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-2 rounded-full"
                  onClick={() => window.open(waLink(c.mobile, `Hi ${c.name}, we found your profile on Smart Crewing for a ${c.rank} position.`), "_blank")}
                  data-testid={`whatsapp-${c.id}`}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
                disabled={busy === c.id}
                onClick={() => unlock(c.id)}
                data-testid={`unlock-btn-${c.id}`}
              >
                <IndianRupee className="w-4 h-4" /> {busy === c.id ? "Processing..." : "Unlock full CV · ₹49"}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Seeker view — matching vacancies (company name/contact gated)
  const eligible = res.eligible;
  return (
    <div data-testid="matches-seeker">
      {!eligible && <EligibilityGate referralCode={res.profile?.referral_code} onEligible={load} />}
      {eligible && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[#25D366] rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 px-4 py-3" data-testid="eligible-banner">
          <CheckCircle2 className="w-4 h-4" /> Company names &amp; contacts are unlocked. Tap WhatsApp to reach out directly.
        </div>
      )}
      {!res.matches.length ? (
        <Empty text="No matching vacancies yet. Check back soon — new jobs are posted daily." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {res.matches.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-5" data-testid={`match-card-${p.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#0066FF]" />
                </div>
                <div>
                  <div className={`font-heading font-bold leading-tight ${!eligible ? "text-[#8A8F9E]" : ""}`}>{p.company_name}</div>
                  <div className="text-xs text-[#8A8F9E]">{p.rank}</div>
                </div>
              </div>
              {p.summary && <p className="text-xs text-[#8A8F9E] mb-4">{p.summary}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vessel" value={p.vessel_type} />
                <Field label="Min. sea time" value={p.sea_time} tag={p.sea_time_priority} />
                <Field label="COC" value={Array.isArray(p.coc) ? p.coc.join(", ") : p.coc} />
                <Field label="US Visa" value={p.us_visa} />
                <Field label="Joining" value={p.availability} tag={p.availability_priority} />
              </div>
              {eligible ? (
                <Button
                  className="w-full mt-4 bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-2 rounded-full"
                  onClick={() => window.open(waLink(p.company_mobile, `Hi, I found your ${p.rank} vacancy on Smart Crewing and I'd like to apply.`), "_blank")}
                  data-testid={`seeker-whatsapp-${p.id}`}
                >
                  <MessageCircle className="w-4 h-4" /> Contact {p.company_name} on WhatsApp
                </Button>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#FF5A00]">
                  <Lock className="w-3.5 h-3.5" /> Company name &amp; contact locked
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
