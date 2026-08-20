import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Navigation, Anchor, Ship, Calendar, Plus } from "lucide-react";
import { formatDateInput } from "@/lib/formatDate";

const STATUS = ["Onboard", "On Leave", "Available Now", "Available From"];

const statusColor = (s) => ({
  "Onboard": "text-[#0066FF] border-[#0066FF]/40 bg-[#0066FF]/10",
  "On Leave": "text-[#DFFF00] border-[#DFFF00]/40 bg-[#DFFF00]/10",
  "Available Now": "text-[#25D366] border-[#25D366]/40 bg-[#25D366]/10",
  "Available From": "text-[#FF5A00] border-[#FF5A00]/40 bg-[#FF5A00]/10",
}[s] || "text-[#8A8F9E] border-white/10 bg-white/5");

export const Movement = () => {
  const [data, setData] = useState({ history: [], current: {} });
  const [status, setStatus] = useState("Available Now");
  const [availableFrom, setAvailableFrom] = useState("");
  const [vessel, setVessel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/movement").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/movement", { status, available_from: availableFrom, vessel, note });
      toast.success("Availability updated");
      setNote(""); setVessel(""); setAvailableFrom("");
      load();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-6" data-testid="movement-panel">
      {/* update card */}
      <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-5 h-fit">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-4 h-4 text-[#FF5A00]" />
          <h3 className="font-heading font-bold">Update movement</h3>
        </div>

        {data.current?.status && (
          <div className={`mb-4 px-3 py-2 rounded-lg border text-sm ${statusColor(data.current.status)}`} data-testid="current-status">
            Current: <b>{data.current.status}</b>
            {data.current.available_from && ` · from ${data.current.available_from}`}
            {data.current.vessel && ` · ${data.current.vessel}`}
          </div>
        )}

        <div className="space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-black/30 border-white/10" data-testid="movement-status-select"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]">
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {(status === "Available From" || status === "On Leave") && (
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-[#8A8F9E]" />
              <Input className="bg-black/30 border-white/10 pl-9 font-data" placeholder="Available from (DD/MM/YYYY)" maxLength={10} value={availableFrom} onChange={(e) => setAvailableFrom(formatDateInput(e.target.value))} data-testid="movement-date-input" />
            </div>
          )}
          {status === "Onboard" && (
            <div className="relative">
              <Ship className="w-4 h-4 absolute left-3 top-3 text-[#8A8F9E]" />
              <Input className="bg-black/30 border-white/10 pl-9" placeholder="Vessel name" value={vessel} onChange={(e) => setVessel(e.target.value)} data-testid="movement-vessel-input" />
            </div>
          )}
          <Textarea className="bg-black/30 border-white/10" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="movement-note-input" />
          <Button className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2" disabled={saving} onClick={save} data-testid="movement-save-btn">
            <Plus className="w-4 h-4" /> {saving ? "Saving..." : "Log movement"}
          </Button>
        </div>
      </div>

      {/* timeline */}
      <div>
        <h3 className="font-heading font-bold mb-4 text-[#8A8F9E] uppercase tracking-wider text-sm">Movement timeline</h3>
        {data.history.length === 0 ? (
          <div className="text-center py-16 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl">
            No movement logged yet. Track when you sign on/off and when you're next available.
          </div>
        ) : (
          <div className="relative pl-6" data-testid="movement-timeline">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
            {data.history.map((m) => (
              <div key={m.id} className="relative mb-5" data-testid={`movement-${m.id}`}>
                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#FF5A00] border-2 border-[#05050A]" />
                <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(m.status)}`}>{m.status}</span>
                    <span className="text-xs font-data text-[#8A8F9E]">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  {m.available_from && <div className="text-sm mt-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#8A8F9E]" /> From {m.available_from}</div>}
                  {m.vessel && <div className="text-sm mt-1 flex items-center gap-1"><Anchor className="w-3.5 h-3.5 text-[#8A8F9E]" /> {m.vessel}</div>}
                  {m.note && <div className="text-xs text-[#8A8F9E] mt-1">{m.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
