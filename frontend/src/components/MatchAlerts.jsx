import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PhoneField } from "@/components/PhoneField";
import { toast } from "sonner";
import { Bell, MessageCircle, Check } from "lucide-react";

const waSelf = (num, msg) =>
  `https://wa.me/${(num || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

export const MatchAlerts = ({ newCount = 0, role, onSeen }) => {
  const [enabled, setEnabled] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/alerts/status")
      .then((r) => { setEnabled(r.data.enabled); setWhatsapp(r.data.whatsapp || ""); })
      .catch(() => {});
  }, []);

  const save = async (nextEnabled, nextWhatsapp) => {
    setSaving(true);
    try {
      const r = await api.post("/alerts/optin", { enabled: nextEnabled, whatsapp: nextWhatsapp });
      setEnabled(r.data.enabled);
      setWhatsapp(r.data.whatsapp);
      toast.success(nextEnabled ? "WhatsApp match alerts turned on" : "Match alerts turned off");
      setEditing(false);
    } catch {
      toast.error("Could not save alert settings");
    } finally {
      setSaving(false);
    }
  };

  const markSeen = async () => {
    try { await api.post("/matches/mark-seen"); onSeen?.(); }
    catch { toast.error("Could not update. Please try again."); }
  };

  const label = role === "provider" ? "crew" : "vacancies";

  return (
    <div className="mb-6 space-y-3" data-testid="match-alerts">
      {newCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#DFFF00]/30 bg-[#DFFF00]/5 px-4 py-3" data-testid="new-matches-banner">
          <Bell className="w-4 h-4 text-[#DFFF00] shrink-0" />
          <span className="text-sm text-[#DFFF00] flex-1 min-w-[140px]">
            {newCount} new {newCount === 1 ? "match" : "matches"} since your last visit
          </span>
          <Button
            size="sm"
            title="Demo: opens WhatsApp with a prefilled message"
            className="bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-2 rounded-full"
            onClick={() => window.open(waSelf(whatsapp, `Smart Crewing: you have ${newCount} new matching ${label}. Open the app to view them.`), "_blank")}
            data-testid="notify-whatsapp-btn"
          >
            <MessageCircle className="w-4 h-4" /> Notify me on WhatsApp
          </Button>
          <Button size="sm" variant="ghost" className="text-[#8A8F9E] gap-1" onClick={markSeen} data-testid="mark-seen-btn">
            <Check className="w-4 h-4" /> Mark seen
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0A0B12] px-4 py-3" data-testid="alert-optin-row">
        <Bell className="w-4 h-4 text-[#FF5A00] shrink-0" />
        <div className="flex-1 min-w-[180px]">
          <div className="text-sm font-medium">WhatsApp match alerts</div>
          <div className="text-[11px] text-[#8A8F9E]">Get a WhatsApp nudge when new {label} match your profile · demo</div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <PhoneField value={whatsapp} onChange={setWhatsapp} testId="alert-phone" />
            </div>
            <Button size="sm" disabled={saving} className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" onClick={() => save(true, whatsapp)} data-testid="save-alert-btn">
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {enabled && (
              <button className="text-xs text-[#8A8F9E] underline" onClick={() => setEditing(true)} data-testid="edit-alert-num">
                {whatsapp || "set number"}
              </button>
            )}
            <Switch
              checked={enabled}
              className="data-[state=unchecked]:bg-white/20 border border-white/20"
              onCheckedChange={(v) => { if (v) setEditing(true); else save(false, whatsapp); }}
              data-testid="alert-toggle"
            />
          </div>
        )}
      </div>
    </div>
  );
};
