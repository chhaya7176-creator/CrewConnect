import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Empty } from "@/pages/Dashboard";
import { Upload, FileText, Trash2, ExternalLink } from "lucide-react";

const CATEGORIES = ["CV / Resume", "COC / License", "Passport", "CDC", "Medical", "STCW", "Other"];

export const Documents = ({ onChange }) => {
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState("CV / Resume");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/documents").then((r) => setDocs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/documents?category=${encodeURIComponent(category)}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded");
      load();
      onChange?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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

  return (
    <div className="space-y-5" data-testid="documents-panel">
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#0A0B12]">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48 bg-black/30 border-white/10" data-testid="doc-category-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]">
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" data-testid="doc-file-input" />
        <Button
          className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          data-testid="doc-upload-btn"
        >
          <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload document"}
        </Button>
        <span className="text-xs text-[#8A8F9E]">PDF, images or Word — stored securely to your account.</span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
