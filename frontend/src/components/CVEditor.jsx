import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Save, Download, Plus, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";

const SECTIONS = {
  personal: { title: "Personal Details", fields: [
    ["full_name", "Full Name"], ["date_of_birth", "Date of Birth"], ["nationality", "Nationality"],
    ["gender", "Gender"], ["marital_status", "Marital Status"], ["place_of_birth", "Place of Birth"],
  ]},
  contact: { title: "Contact", fields: [
    ["mobile", "Mobile"], ["email", "Email"], ["address", "Address"], ["nearest_airport", "Nearest Airport"],
  ]},
  professional: { title: "Professional & Certification", fields: [
    ["present_rank", "Present Rank"], ["applied_rank", "Applied Rank"], ["total_sea_experience_months", "Sea Exp (months)"],
    ["coc_grade", "COC Grade"], ["coc_issuing_authority", "COC Authority"], ["coc_number", "COC Number"],
    ["indos_number", "INDOS"], ["passport_number", "Passport"], ["passport_expiry", "Passport Expiry"],
    ["cdc_number", "CDC Number"], ["cdc_expiry", "CDC Expiry"],
  ]},
  visas: { title: "Visas", fields: [
    ["us_visa_status", "US Visa"], ["schengen_visa", "Schengen"], ["other_visas", "Other Visas"],
  ]},
  availability: { title: "Availability", fields: [
    ["available_from", "Available From"], ["expected_wages", "Expected Wages"],
  ]},
  next_of_kin: { title: "Next of Kin", fields: [
    ["name", "Name"], ["relation", "Relation"], ["contact", "Contact"],
  ]},
};

const SEA_COLS = [["company", "Company"], ["vessel_name", "Vessel"], ["vessel_type", "Type"], ["rank", "Rank"], ["grt_bhp", "GRT/BHP"], ["from_date", "From"], ["to_date", "To"]];
const CERT_COLS = [["name", "Certificate"], ["number", "Number"], ["issue_date", "Issue"], ["expiry_date", "Expiry"]];

export const CVEditor = ({ cv, isAdmin = false, onSaved }) => {
  const [data, setData] = useState(cv.data);
  const [missing, setMissing] = useState(cv.missing_fields || []);
  const [uncertain, setUncertain] = useState(cv.uncertain_fields || []);
  const [touched, setTouched] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const markTouched = (path) => setTouched((t) => new Set(t).add(path));

  const setField = (section, key, value) => {
    markTouched(`${section}.${key}`);
    setData((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  };

  const setArr = (section, i, key, value) => {
    markTouched(`${section}[${i}].${key}`);
    setData((d) => ({ ...d, [section]: d[section].map((row, idx) => (idx === i ? { ...row, [key]: value } : row)) }));
  };

  const addRow = (section, cols) =>
    setData((d) => ({ ...d, [section]: [...(d[section] || []), Object.fromEntries(cols.map(([k]) => [k, ""]))] }));

  const delRow = (section, i) =>
    setData((d) => ({ ...d, [section]: d[section].filter((_, idx) => idx !== i) }));

  const cls = (path) => {
    if (missing.includes(path)) return "border-[#ef4444] ring-1 ring-[#ef4444]/40 bg-[#ef4444]/5";
    if (uncertain.includes(path)) return "border-[#DFFF00] field-blink";
    return "border-white/10";
  };

  const save = async () => {
    setSaving(true);
    const remaining = uncertain.filter((p) => !touched.has(p));
    try {
      const res = await api.put(`/cv/${cv.id}`, { data, uncertain_fields: remaining });
      setMissing(res.data.missing_fields || []);
      setUncertain(remaining);
      setTouched(new Set());
      toast.success(isAdmin ? "CV updated (admin)" : "CV saved");
      onSaved?.(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const token = localStorage.getItem("mc_token");
    window.open(`${api.defaults.baseURL}/cv/${cv.id}/pdf?auth=${token}`, "_blank");
  };

  return (
    <div className="space-y-5" data-testid="cv-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          {missing.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/40 text-[#ff6b6b]" data-testid="missing-count">
              <AlertTriangle className="w-3.5 h-3.5" /> {missing.length} required field(s) missing
            </span>
          )}
          {uncertain.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFFF00]/10 border border-[#DFFF00]/40 text-[#DFFF00]">
              <ShieldAlert className="w-3.5 h-3.5" /> {uncertain.length} field(s) to verify
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 bg-transparent hover:bg-white/5 gap-2 rounded-full" onClick={download} data-testid="cv-download-btn">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] gap-2 rounded-full" disabled={saving} onClick={save} data-testid="cv-save-btn">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-[#8A8F9E]">
        Fields in <span className="text-[#ff6b6b]">red</span> are required but missing.
        Fields in <span className="text-[#DFFF00]">blinking yellow</span> were auto-read and may need verification. {isAdmin && "You are editing as ADMIN."}
      </p>

      {Object.entries(SECTIONS).map(([section, cfg]) => (
        <div key={section} className="rounded-xl border border-white/10 bg-[#0A0B12] p-5">
          <h4 className="font-heading font-bold text-sm text-[#FF5A00] mb-4 uppercase tracking-wider">{cfg.title}</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cfg.fields.map(([key, label]) => {
              const path = `${section}.${key}`;
              return (
                <div key={key}>
                  <label className="text-[11px] uppercase tracking-wide text-[#8A8F9E]">{label}</label>
                  <Input
                    className={`bg-black/30 mt-1 focus:ring-2 focus:ring-[#FF5A00] ${cls(path)}`}
                    value={data[section]?.[key] || ""}
                    onChange={(e) => setField(section, key, e.target.value)}
                    data-testid={`cv-field-${path}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sea service */}
      <ArrayTable title="Sea Service History" section="sea_service" cols={SEA_COLS}
        rows={data.sea_service || []} setArr={setArr} addRow={() => addRow("sea_service", SEA_COLS)} delRow={delRow} uncertain={uncertain} />
      {/* Certificates */}
      <ArrayTable title="Certificates & Licenses" section="certificates" cols={CERT_COLS}
        rows={data.certificates || []} setArr={setArr} addRow={() => addRow("certificates", CERT_COLS)} delRow={delRow} uncertain={uncertain} />
    </div>
  );
};

const ArrayTable = ({ title, section, cols, rows, setArr, addRow, delRow, uncertain }) => (
  <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-5">
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-heading font-bold text-sm text-[#0066FF] uppercase tracking-wider">{title}</h4>
      <Button size="sm" variant="outline" className="border-white/10 bg-transparent hover:bg-white/5 gap-1 rounded-full" onClick={addRow} data-testid={`add-${section}`}>
        <Plus className="w-3.5 h-3.5" /> Add
      </Button>
    </div>
    {rows.length === 0 ? (
      <p className="text-xs text-[#8A8F9E]">No entries.</p>
    ) : (
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-white/5 bg-black/20" data-testid={`${section}-row-${i}`}>
            {cols.map(([key, label]) => {
              const path = `${section}[${i}].${key}`;
              const blink = uncertain.includes(path) ? "border-[#DFFF00] field-blink" : "border-white/10";
              return (
                <div key={key} className="flex-1 min-w-[110px]">
                  <label className="text-[10px] uppercase text-[#8A8F9E]">{label}</label>
                  <Input className={`bg-black/30 mt-1 h-9 text-sm ${blink}`} value={row[key] || ""} onChange={(e) => setArr(section, i, key, e.target.value)} data-testid={`cv-arr-${path}`} />
                </div>
              );
            })}
            <Button size="sm" variant="ghost" className="text-[#8A8F9E] hover:text-[#ef4444]" onClick={() => delRow(section, i)} data-testid={`del-${section}-${i}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
);
