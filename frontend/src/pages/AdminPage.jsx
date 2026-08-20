import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CVEditor } from "@/components/CVEditor";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Building2, FileText, FileScan, MessageSquare, Ship, ChevronRight, ShieldCheck, ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !user.is_admin) { navigate("/"); return; }
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/cvs").then((r) => setCvs(r.data)).catch(() => {});
  }, [user, loading, navigate]);

  if (!user?.is_admin) return null;

  const STAT_CARDS = stats ? [
    { icon: Users, label: "Users", value: stats.users },
    { icon: Ship, label: "Seekers", value: stats.seekers },
    { icon: Building2, label: "Providers", value: stats.providers },
    { icon: FileText, label: "Documents", value: stats.documents },
    { icon: FileScan, label: "Parsed CVs", value: stats.parsed_cvs },
    { icon: MessageSquare, label: "Feedback", value: stats.feedback },
  ] : [];

  return (
    <div className="min-h-screen bg-[#05050A]">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-8">
        <div className="flex items-center gap-2 text-[#DFFF00] text-xs font-data uppercase tracking-widest mb-1">
          <ShieldCheck className="w-4 h-4" /> Admin Console
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl mb-6">Maritime Connect — Team</h1>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-white/10 bg-[#0A0B12]" data-testid={`admin-stat-${s.label}`}>
              <s.icon className="w-4 h-4 text-[#0066FF] mb-2" />
              <div className="font-data font-bold text-2xl">{s.value}</div>
              <div className="text-xs text-[#8A8F9E]">{s.label}</div>
            </div>
          ))}
        </div>

        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-[#8A8F9E] hover:text-white mb-4" data-testid="admin-back-btn">
              <ArrowLeft className="w-4 h-4" /> Back to all CVs
            </button>
            <CVEditor key={selected.id} cv={selected} isAdmin onSaved={(u) => setSelected(u)} />
          </div>
        ) : (
          <>
            <h3 className="font-heading font-bold text-lg mb-4">All parsed CVs ({cvs.length})</h3>
            {cvs.length === 0 ? (
              <div className="text-center py-16 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl">No CVs parsed yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-cv-list">
                {cvs.map((cv) => (
                  <button
                    key={cv.id}
                    onClick={() => setSelected(cv)}
                    className="text-left p-4 rounded-xl border border-white/10 bg-[#0A0B12] hover:border-[#FF5A00] hover:-translate-y-0.5 transition-transform flex items-center gap-3"
                    data-testid={`admin-cv-${cv.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center shrink-0">
                      <FileScan className="w-5 h-5 text-[#FF5A00]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{cv.data?.personal?.full_name || cv.source_filename}</div>
                      <div className="text-[11px] text-[#8A8F9E] truncate">{cv.data?.professional?.present_rank || "—"}</div>
                      <div className="flex gap-2 mt-1">
                        {cv.missing_fields?.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ff6b6b]">{cv.missing_fields.length} missing</span>}
                        {cv.uncertain_fields?.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#DFFF00]/15 text-[#DFFF00]">{cv.uncertain_fields.length} verify</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8A8F9E]" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
