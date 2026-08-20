import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Empty } from "@/pages/Dashboard";
import { Lock, Unlock, IndianRupee, Ship, Building2, Anchor } from "lucide-react";

const Field = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-[#8A8F9E]">{label}</div>
    <div className="text-sm font-data mt-0.5">{value}</div>
  </div>
);

export const Matches = () => {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => api.get("/matches").then((r) => setRes(r.data)).catch(() => setRes({ role: null, matches: [] }));
  useEffect(() => { load(); }, []);

  const unlock = async (id) => {
    setBusy(id);
    try {
      await api.post("/unlock-cv", { seeker_id: id });
      toast.success("CV unlocked! (₹20 paid — demo)");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Unlock failed");
    } finally {
      setBusy(null);
    }
  };

  if (!res) return <Empty text="Loading matches..." />;
  if (!res.role) return <Empty text="Complete a profile or requirement in the chat to see your matches." />;
  if (!res.matches.length) return <Empty text="No matches yet. Check back soon — new candidates join daily." />;

  // Provider view — candidate CVs with locked contacts
  if (res.role === "provider") {
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

            <p className="text-xs text-[#8A8F9E] mb-4 min-h-[48px]">{c.summary}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Vessel" value={c.vessel_type} />
              <Field label="Sea time" value={c.sea_time} />
              <Field label="COC" value={c.coc} />
              <Field label="US Visa" value={c.us_visa} />
              <Field label="Available" value={c.availability} />
            </div>

            <div className={`rounded-lg border p-3 mb-3 relative ${c.unlocked ? "border-[#25D366]/40 bg-[#25D366]/5" : "border-white/10 bg-black/30"}`}>
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

            {c.unlocked ? (
              <Button disabled className="w-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 gap-2 rounded-full" data-testid={`unlocked-${c.id}`}>
                <Unlock className="w-4 h-4" /> Contact unlocked
              </Button>
            ) : (
              <Button
                className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
                disabled={busy === c.id}
                onClick={() => unlock(c.id)}
                data-testid={`unlock-btn-${c.id}`}
              >
                <IndianRupee className="w-4 h-4" /> {busy === c.id ? "Processing..." : "Unlock full CV · ₹20"}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Seeker view — matching company requirements
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="matches-seeker">
      {res.matches.map((p) => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-5" data-testid={`match-card-${p.id}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#0066FF]" />
            </div>
            <div>
              <div className="font-heading font-bold leading-tight">{p.company_name}</div>
              <div className="text-xs text-[#8A8F9E]">{p.rank}</div>
            </div>
          </div>
          <p className="text-xs text-[#8A8F9E] mb-4 min-h-[48px]">{p.summary}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vessel" value={p.vessel_type} />
            <Field label="Min. sea time" value={p.sea_time} />
            <Field label="US Visa" value={p.us_visa} />
            <Field label="Joining" value={p.availability} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-[#25D366]">
            <Ship className="w-3.5 h-3.5" /> You match this requirement
          </div>
        </div>
      ))}
    </div>
  );
};
