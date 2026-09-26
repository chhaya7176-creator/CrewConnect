import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDateInput } from "@/lib/formatDate";

const PRIORITIES = ["Mandatory", "Preferred"];

const Fld = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-[#8A8F9E]">{label}</Label>
    {children}
  </div>
);

const Dropdown = ({ value, onChange, options, testId, placeholder }) => (
  <Select value={value || ""} onValueChange={onChange}>
    <SelectTrigger className="bg-black/30 border-white/10" data-testid={testId}>
      <SelectValue placeholder={placeholder || "Select"} />
    </SelectTrigger>
    <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6] max-h-72">
      {(options || []).map((o) => (
        <SelectItem key={o} value={o} data-testid={`${testId}-opt-${o}`}>{o}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const EditPostDialog = ({ open, onOpenChange, post, isCompany, onSaved }) => {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({});
  const [coc, setCoc] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) api.get("/config").then((r) => setCfg(r.data)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open && post) {
      setForm({ ...post });
      setCoc(Array.isArray(post.coc) ? post.coc : post.coc ? [post.coc] : []);
    }
  }, [open, post]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCoc = (c) => setCoc((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const save = async () => {
    setBusy(true);
    try {
      if (isCompany) {
        const payload = {
          rank: form.rank, vessel_type: form.vessel_type, sea_time: form.sea_time,
          sea_time_priority: form.sea_time_priority || "Mandatory",
          coc: coc.length ? coc : ["Any"], coc_priority: form.coc_priority || "Mandatory",
          us_visa: form.us_visa, us_visa_priority: form.us_visa_priority || "Preferred",
          mobile: form.mobile, consent: true, company_name: form.company_name,
          email: form.email, availability: form.availability,
          availability_priority: form.availability_priority || "Preferred",
          summary: form.summary || "",
        };
        await api.put(`/provider/requirement/${post.id}`, payload);
      } else {
        const payload = {
          rank: form.rank, vessel_type: form.vessel_type, sea_time: form.sea_time,
          coc: coc[0] || form.coc, us_visa: form.us_visa, other_visa: form.other_visa || "",
          mobile: form.mobile, consent: true, name: form.name, email: form.email,
          availability: form.availability, summary: form.summary || "",
        };
        await api.put(`/seeker/profile/${post.id}`, payload);
      }
      toast.success("Details updated");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save changes");
    } finally {
      setBusy(false);
    }
  };

  if (!post) return null;
  const cocOptions = isCompany ? cfg?.coc_provider : cfg?.coc_seeker;
  const visaOptions = isCompany ? cfg?.us_visa_provider : cfg?.us_visa_seeker;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12131A] border-white/10 text-[#F3F4F6] max-w-lg max-h-[85vh] overflow-y-auto" data-testid="edit-post-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-2xl">Correct your details</DialogTitle>
          <DialogDescription className="text-[#8A8F9E]">
            Update the information you submitted. Changes take effect on your matches immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          {isCompany ? (
            <Fld label="Company name">
              <Input className="bg-black/30 border-white/10" value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} data-testid="edit-company-name" />
            </Fld>
          ) : (
            <Fld label="Full name">
              <Input className="bg-black/30 border-white/10" value={form.name || ""} onChange={(e) => set("name", e.target.value)} data-testid="edit-name" />
            </Fld>
          )}
          <Fld label="Email">
            <Input className="bg-black/30 border-white/10" value={form.email || ""} onChange={(e) => set("email", e.target.value)} data-testid="edit-email" />
          </Fld>

          <Fld label="Rank">
            <Dropdown value={form.rank} onChange={(v) => set("rank", v)} options={cfg?.ranks} testId="edit-rank" />
          </Fld>
          <Fld label="Vessel type">
            <Dropdown value={form.vessel_type} onChange={(v) => set("vessel_type", v)} options={isCompany ? ["Any", ...(cfg?.vessel_types || [])] : cfg?.vessel_types} testId="edit-vessel" />
          </Fld>

          <Fld label={isCompany ? "Min. sea time" : "Sea time"}>
            <Dropdown value={form.sea_time} onChange={(v) => set("sea_time", v)} options={cfg?.sea_time} testId="edit-sea-time" />
          </Fld>
          <Fld label="US Visa">
            <Dropdown value={form.us_visa} onChange={(v) => set("us_visa", v)} options={visaOptions} testId="edit-visa" />
          </Fld>

          <Fld label={isCompany ? "Joining date" : "Available from"}>
            <Input className="bg-black/30 border-white/10 font-data" value={form.availability || ""} onChange={(e) => set("availability", formatDateInput(e.target.value))} placeholder="dd/mm/yyyy" data-testid="edit-availability" />
          </Fld>
          <Fld label="Mobile (locked)">
            <Input disabled className="bg-black/20 border-white/10 font-data text-[#8A8F9E]" value={form.mobile || ""} data-testid="edit-mobile" />
          </Fld>

          <div className="sm:col-span-2">
            <Fld label={isCompany ? "Acceptable COC (select all that apply)" : "COC"}>
              {isCompany ? (
                <div className="flex flex-wrap gap-2" data-testid="edit-coc-multi">
                  {(cocOptions || []).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleCoc(c)}
                      data-testid={`edit-coc-${c}`}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${coc.includes(c) ? "bg-[#25D366]/20 border-[#25D366]/60 text-[#25D366]" : "bg-black/30 border-white/10 text-[#C9CFDA] hover:border-white/30"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <Dropdown value={coc[0] || form.coc} onChange={(v) => setCoc([v])} options={cocOptions} testId="edit-coc" />
              )}
            </Fld>
          </div>

          {isCompany && (
            <>
              <Fld label="Sea time priority">
                <Dropdown value={form.sea_time_priority} onChange={(v) => set("sea_time_priority", v)} options={PRIORITIES} testId="edit-sea-time-priority" />
              </Fld>
              <Fld label="COC priority">
                <Dropdown value={form.coc_priority} onChange={(v) => set("coc_priority", v)} options={PRIORITIES} testId="edit-coc-priority" />
              </Fld>
            </>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" className="rounded-full border-white/15 bg-transparent" onClick={() => onOpenChange(false)} data-testid="edit-cancel-btn">Cancel</Button>
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" disabled={busy} onClick={save} data-testid="edit-save-btn">
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
