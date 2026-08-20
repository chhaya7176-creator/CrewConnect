import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CVEditor } from "@/components/CVEditor";
import { Empty } from "@/pages/Dashboard";
import { FileScan, ChevronRight } from "lucide-react";

export const StandardCV = () => {
  const [cvs, setCvs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/cv");
      setCvs(res.data);
      setSelected(res.data[0] || null);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Empty text="Loading..." />;
  if (!cvs.length)
    return <Empty text="No standard CV yet. Go to the Documents tab, upload your CV/biodata (PDF, Word, or a scanned/handwritten image) and click 'Parse to standard'." />;

  return (
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6" data-testid="standard-cv-panel">
      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-[#8A8F9E] mb-2">Parsed CVs</h4>
        {cvs.map((cv) => (
          <button
            key={cv.id}
            onClick={() => setSelected(cv)}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-2 transition-colors ${selected?.id === cv.id ? "border-[#FF5A00] bg-[#FF5A00]/10" : "border-white/10 bg-[#0A0B12] hover:border-white/20"}`}
            data-testid={`cv-select-${cv.id}`}
          >
            <FileScan className="w-4 h-4 text-[#FF5A00] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{cv.data?.personal?.full_name || cv.source_filename}</div>
              <div className="text-[11px] text-[#8A8F9E] truncate">{cv.source_filename}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8A8F9E]" />
          </button>
        ))}
      </div>
      <div>{selected && <CVEditor key={selected.id} cv={selected} onSaved={(u) => { setSelected(u); load(); }} />}</div>
    </div>
  );
};
