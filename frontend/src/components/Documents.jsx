import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Empty } from "@/pages/Dashboard";
import { Upload, FileText, Trash2, ExternalLink, HardDrive, FileScan } from "lucide-react";

const CATEGORIES = ["CV / Resume", "COC / License", "Passport", "CDC", "Medical", "STCW", "Other"];
const LIMIT_BYTES = 100 * 1024 * 1024;
const fmtMB = (b) => (b / (1024 * 1024)).toFixed(1);

export const Documents = ({ onChange }) => {
  const [docs, setDocs] = useState([]);
  const [usage, setUsage] = useState({ used: 0, limit: LIMIT_BYTES, remaining: LIMIT_BYTES });
  const [category, setCategory] = useState("CV / Resume");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    api.get("/documents").then((r) => setDocs(r.data)).catch(() => {});
    api.get("/documents/usage").then((r) => setUsage(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const perFileCap = 5 * 1024 * 1024;
    const acctMB = Math.round((usage.limit || 0) / (1024 * 1024));
    let running = usage.used;
    let ok = 0;
    const errs = [];
    for (const file of files) {
      if (file.size > perFileCap) { errs.push(`${file.name}: over the 5 MB per-file limit`); continue; }
      if (running + file.size > usage.limit) { errs.push(`${file.name}: exceeds your ${acctMB} MB account limit`); continue; }
      const fd = new FormData();
      fd.append("file", file);
      try {
        await api.post(`/documents?category=${encodeURIComponent(category)}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        running += file.size;
        ok++;
      } catch (err) {
        errs.push(`${file.name}: ${err.response?.data?.detail || "upload failed"}`);
      }
    }
    if (ok) toast.success(`${ok} document${ok > 1 ? "s" : ""} uploaded`);
    errs.forEach((m) => toast.error(m));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
    onChange?.();
  };

  const view = (id) => {
    const token = localStorage.getItem("mc_token");
    window.open(`${api.defaults.baseURL}/documents/${id}/download?auth=${token}`, "_blank");
  };

  const remove = async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Document removed");
      load();
      onChange?.();
    } catch {
      toast.error("Delete failed");
    }
  };

  const [parsing, setParsing] = useState(null);
  const parseCv = async (id) => {
    setParsing(id);
    try {
      const res = await api.post("/cv/parse", { document_id: id });
      const miss = res.data.missing_fields?.length || 0;
      const unc = res.data.uncertain_fields?.length || 0;
      toast.success(`CV parsed! Open the "Standard CV" tab to review.${miss ? ` ${miss} field(s) missing.` : ""}${unc ? ` ${unc} to verify.` : ""}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Parsing failed");
    } finally {
      setParsing(null);
    }
  };

  const isCv = (d) => /cv|resume|biodata/i.test(d.category) || /cv|resume|biodata/i.test(d.original_filename);

  const limitMB = Math.round((usage.limit || 0) / (1024 * 1024));
  const pct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <div className="space-y-5" data-testid="documents-panel">
      {/* storage usage */}
      <div className="p-4 rounded-xl border border-white/10 bg-[#0A0B12]" data-testid="storage-usage">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="w-4 h-4 text-[#0066FF]" /> Document storage
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#8A8F9E] uppercase">{usage.user_type === "company" ? "Company" : "Crew"}</span>
          </div>
          <div className="text-xs font-data text-[#8A8F9E]">
            <span className={pct > 90 ? "text-[#FF5A00]" : "text-[#F3F4F6]"}>{fmtMB(usage.used)} MB</span> / {limitMB} MB
          </div>
        </div>
        <Progress value={pct} className="h-2 bg-white/10 [&>div]:bg-[#FF5A00]" />
        <div className="text-[11px] text-[#8A8F9E] mt-1.5">{fmtMB(usage.remaining)} MB free · up to {limitMB} MB per account</div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#0A0B12]">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48 bg-black/30 border-white/10" data-testid="doc-category-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]">
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} accept=".pdf,.png,.jpg,.jpeg,.txt,.docx" data-testid="doc-file-input" />
        <Button
          className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
          disabled={uploading || usage.remaining <= 0}
          onClick={() => fileRef.current?.click()}
          data-testid="doc-upload-btn"
        >
          <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload documents"}
        </Button>
        <span className="text-xs text-[#8A8F9E]">Select one or more files (PDF, images or Word) — stored securely to your account.</span>
      </div>

      {docs.length === 0 ? (
        <Empty text="No documents yet. Upload your CV, COC, passport and certificates." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="documents-list">
          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-4 flex flex-col" data-testid={`doc-${d.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0066FF]" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF5A00]/15 text-[#FF5A00] border border-[#FF5A00]/30">{d.category}</span>
              </div>
              <div className="text-sm font-medium truncate" title={d.original_filename}>{d.original_filename}</div>
              <div className="text-xs text-[#8A8F9E] font-data mt-0.5">{(d.size / 1024).toFixed(0)} KB</div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1 border-white/10 bg-transparent hover:bg-white/5 gap-1" onClick={() => view(d.id)} data-testid={`doc-view-${d.id}`}>
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </Button>
                <Button size="sm" variant="ghost" className="text-[#8A8F9E] hover:text-[#ef4444]" onClick={() => remove(d.id)} data-testid={`doc-delete-${d.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {isCv(d) && (
                <Button
                  size="sm"
                  className="w-full mt-2 bg-[#0066FF] hover:bg-[#0052cc] gap-1.5 rounded-full"
                  disabled={parsing === d.id}
                  onClick={() => parseCv(d.id)}
                  data-testid={`doc-parse-${d.id}`}
                >
                  <FileScan className="w-3.5 h-3.5" /> {parsing === d.id ? "Parsing..." : "Parse to standard"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
