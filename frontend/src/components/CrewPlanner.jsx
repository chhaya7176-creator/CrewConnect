import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateInput } from "@/lib/formatDate";
import { Ship, MapPin, CalendarDays, Plus, Trash2, Anchor, BellRing } from "lucide-react";

const parseDMY = (s) => {
  const m = /^\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s || "");
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d) ? null : d;
};

const daysUntil = (s) => {
  const d = parseDMY(s);
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

// Urgency bands: <7 red (fast), 7-14 orange (medium), 15-30 yellow (slow), >30 green (steady)
const urgency = (dl) => {
  if (dl == null) return { tone: "gray", color: "#8A8F9E", pulse: "", dot: "", label: "No date" };
  if (dl < 7) return { tone: "red", color: "#ef4444", pulse: "crew-pulse-red", dot: "crew-dot-fast", label: dl < 0 ? `${-dl}d overdue` : dl === 0 ? "Due today" : `${dl}d left` };
  if (dl < 15) return { tone: "orange", color: "#f97316", pulse: "crew-pulse-orange", dot: "crew-dot-med", label: `${dl}d left` };
  if (dl <= 30) return { tone: "yellow", color: "#eab308", pulse: "crew-pulse-yellow", dot: "crew-dot-slow", label: `${dl}d left` };
  return { tone: "green", color: "#22c55e", pulse: "", dot: "", label: `${dl}d left` };
};

const RankMulti = ({ ranks, selected, onToggle }) => (
  <div className="flex flex-wrap gap-2" data-testid="crew-ranks-multi">
    {(ranks || []).map((r) => (
      <button
        type="button"
        key={r}
        onClick={() => onToggle(r)}
        data-testid={`crew-rank-${r}`}
        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
          selected.includes(r)
            ? "bg-[#FF5A00] border-[#FF5A00] text-white font-semibold"
            : "bg-black/30 border-white/10 text-[#C9CFDA] hover:border-white/30"
        }`}
      >
        {r}
      </button>
    ))}
  </div>
);

const AddDialog = ({ open, onOpenChange, ranks, onSaved }) => {
  const [vessel, setVessel] = useState("");
  const [selRanks, setSelRanks] = useState([]);
  const [byDate, setByDate] = useState("");
  const [port, setPort] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setVessel(""); setSelRanks([]); setByDate(""); setPort(""); setNote(""); }
  }, [open]);

  const toggle = (r) => setSelRanks((c) => (c.includes(r) ? c.filter((x) => x !== r) : [...c, r]));

  const save = async () => {
    if (!vessel.trim()) return toast.error("Enter the vessel name");
    if (!selRanks.length) return toast.error("Select at least one rank needed");
    if (!parseDMY(byDate)) return toast.error("Enter a valid 'By date' (dd/mm/yyyy)");
    if (!port.trim()) return toast.error("Enter the joining port");
    setBusy(true);
    try {
      await api.post("/crew-needs", { vessel_name: vessel.trim(), ranks: selRanks, by_date: byDate, port: port.trim(), note: note.trim() });
      toast.success("Crew requirement added");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12131A] border-white/10 text-[#F3F4F6] max-w-md max-h-[85vh] overflow-y-auto" data-testid="crew-add-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-2xl flex items-center gap-2">
            <Anchor className="w-6 h-6 text-[#FF5A00]" /> New crew requirement
          </DialogTitle>
          <DialogDescription className="text-[#8A8F9E]">
            Plan your crew change — vessel, ranks needed, the join-by date and joining port.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">Vessel name</Label>
            <Input className="bg-black/30 border-white/10" value={vessel} onChange={(e) => setVessel(e.target.value)} placeholder="e.g. MV Ocean Pioneer" data-testid="crew-vessel-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">Ranks needed</Label>
            <RankMulti ranks={ranks} selected={selRanks} onToggle={toggle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">By date</Label>
              <Input className="bg-black/30 border-white/10 font-data" value={byDate} onChange={(e) => setByDate(formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" data-testid="crew-bydate-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">Joining port</Label>
              <Input className="bg-black/30 border-white/10" value={port} onChange={(e) => setPort(e.target.value)} placeholder="e.g. Singapore" data-testid="crew-port-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">Note (optional)</Label>
            <Input className="bg-black/30 border-white/10" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sign-off replacement" data-testid="crew-note-input" />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" className="rounded-full border-white/15 bg-transparent" onClick={() => onOpenChange(false)} data-testid="crew-cancel-btn">Cancel</Button>
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" disabled={busy} onClick={save} data-testid="crew-save-btn">
            {busy ? "Saving..." : "Add requirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CrewPlanner = () => {
  const [ranks, setRanks] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  const load = async () => {
    try {
      const r = await api.get("/crew-needs");
      setNeeds(r.data.crew_needs || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    api.get("/config").then((r) => setRanks(r.data?.crew_planner_ranks || r.data?.ranks || [])).catch(() => {});
    load();
  }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/crew-needs/${id}`);
      toast.success("Requirement removed");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not remove");
    }
  };

  // sort by soonest date
  const sorted = useMemo(() => {
    return [...needs].sort((a, b) => {
      const da = parseDMY(a.by_date), db_ = parseDMY(b.by_date);
      if (!da) return 1;
      if (!db_) return -1;
      return da - db_;
    });
  }, [needs]);

  // vessel-wise grouping for the timeline
  const byVessel = useMemo(() => {
    const map = {};
    for (const n of sorted) {
      const k = n.vessel_name || "Unassigned";
      (map[k] = map[k] || []).push(n);
    }
    return map;
  }, [sorted]);

  const dueDates = useMemo(() => sorted.map((n) => parseDMY(n.by_date)).filter(Boolean), [sorted]);

  return (
    <div className="space-y-6" data-testid="crew-planner">
      {/* Header + pulsing add */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-extrabold text-2xl flex items-center gap-2">
            <Ship className="w-6 h-6 text-[#FF5A00]" /> Crew Planner
          </h3>
          <p className="text-sm text-[#8A8F9E] mt-1">Track upcoming crew changes vessel-wise, on a dated timeline.</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-[#FF5A00] hover:bg-[#E04F00] text-white font-semibold rounded-full gap-2 crew-add-pulse hover:-translate-y-0.5 transition-transform"
          data-testid="crew-add-btn"
        >
          <Plus className="w-4 h-4" /> Add Crew Requirement
        </Button>
      </div>

      {/* Reminder log legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A8F9E]">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Over 30 days</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308] crew-dot-slow" /> 15–30 days</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316] crew-dot-med" /> 7–14 days</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] crew-dot-fast" /> Under 7 days</span>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Calendar */}
        <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-3" data-testid="crew-calendar">
          <div className="flex items-center gap-2 px-2 pt-1 pb-2 text-sm font-semibold">
            <CalendarDays className="w-4 h-4 text-[#0066FF]" /> Crew-change calendar
          </div>
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            modifiers={{ due: dueDates }}
            modifiersClassNames={{ due: "bg-[#FF5A00] text-white font-bold rounded-md" }}
            className="text-[#F3F4F6]"
          />
          <div className="px-2 pb-1 text-[11px] text-[#8A8F9E]">Highlighted dates have a crew requirement due.</div>
        </div>

        {/* Reminder log / vessel-wise timeline */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="w-4 h-4 text-[#FF5A00]" /> Reminder log — {sorted.length} upcoming
          </div>
          {!sorted.length && (
            <div className="text-center py-14 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl" data-testid="crew-empty">
              No crew requirements yet. Tap “Add Crew Requirement” to plan your next crew change.
            </div>
          )}
          {Object.entries(byVessel).map(([vessel, items]) => (
            <div key={vessel} className="rounded-xl border border-white/10 bg-[#0A0B12] overflow-hidden" data-testid={`crew-vessel-group`}>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border-b border-white/10">
                <Ship className="w-4 h-4 text-[#0066FF]" />
                <span className="font-heading font-bold text-sm">{vessel}</span>
                <span className="text-[10px] text-[#8A8F9E]">· {items.length} requirement{items.length > 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-white/5">
                {items.map((n) => {
                  const dl = daysUntil(n.by_date);
                  const u = urgency(dl);
                  return (
                    <div
                      key={n.id}
                      className={`flex items-center gap-4 px-4 py-3.5 border-l-4 ${u.pulse}`}
                      style={{ borderLeftColor: u.color }}
                      data-testid={`crew-need-${n.id}`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: u.color }} data-testid={`crew-dot-${n.id}`}>
                        <span className={`block w-3 h-3 rounded-full ${u.dot}`} style={{ backgroundColor: u.color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {(n.ranks || []).map((r) => (
                            <span key={r} className="text-[10px] font-semibold bg-[#FF5A00] text-white rounded-full px-2 py-0.5">{r}</span>
                          ))}
                        </div>
                        <div className="text-xs text-[#8A8F9E] flex flex-wrap items-center gap-x-3 gap-y-0.5 font-data">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {n.by_date}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {n.port}</span>
                          {n.note && <span className="text-[#C9CFDA]">“{n.note}”</span>}
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold font-data px-2.5 py-1 rounded-full shrink-0"
                        style={{ color: u.color, backgroundColor: `${u.color}22` }}
                        data-testid={`crew-badge-${n.id}`}
                      >
                        {u.label}
                      </span>
                      <button
                        onClick={() => remove(n.id)}
                        className="text-[#8A8F9E] hover:text-[#ef4444] transition-colors shrink-0"
                        data-testid={`crew-delete-${n.id}`}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddDialog open={open} onOpenChange={setOpen} ranks={ranks} onSaved={load} />
    </div>
  );
};
