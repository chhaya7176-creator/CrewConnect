import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { LoginDialog } from "@/components/LoginDialog";
import { CVEditor } from "@/components/CVEditor";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Building2, FileText, FileScan, MessageSquare, Ship, ChevronRight, ShieldCheck, ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [view, setView] = useState("cvs");
  const [selected, setSelected] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const loadAdmin = () => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/cvs").then((r) => setCvs(r.data)).catch(() => {});
    api.get("/admin/feedback").then((r) => setFeedback(r.data)).catch(() => {});
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { setLoginOpen(true); return; }
    if (!user.is_admin) { navigate("/"); return; }
    loadAdmin();
  }, [user, loading, navigate]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-[#05050A]">
        <Navbar onLogin={() => setLoginOpen(true)} />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSuccess={loadAdmin} />
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <h2 className="font-heading font-extrabold text-3xl mb-3">Admin Console</h2>
          <p className="text-[#8A8F9E] mb-6">Log in with an admin mobile number to continue.</p>
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" onClick={() => setLoginOpen(true)} data-testid="admin-login-btn">Login</Button>
        </div>
      </div>
    );
  }

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
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl mb-6">Smart Crewing — Team</h1>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-white/10 bg-[#0A0B12]" data-testid={`admin-stat-${s.label}`}>
              <s.icon className="w-4 h-4 text-[#0066FF] mb-2" />
              <div className="font-data font-bold text-2xl">{s.value}</div>
              <div className="text-xs text-[#8A8F9E]">{s.label}</div>
            </div>
          ))}
        </div>

        {!selected && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView("cvs")}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${view === "cvs" ? "bg-[#FF5A00] border-[#FF5A00] text-white" : "border-white/10 text-[#8A8F9E] hover:text-white"}`}
              data-testid="admin-view-cvs"
            >
              Parsed CVs ({cvs.length})
            </button>
            <button
              onClick={() => setView("feedback")}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${view === "feedback" ? "bg-[#FF5A00] border-[#FF5A00] text-white" : "border-white/10 text-[#8A8F9E] hover:text-white"}`}
              data-testid="admin-view-feedback"
            >
              Feedback ({feedback.length})
            </button>
          </div>
        )}

        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-[#8A8F9E] hover:text-white mb-4" data-testid="admin-back-btn">
              <ArrowLeft className="w-4 h-4" /> Back to all CVs
            </button>
            <CVEditor key={selected.id} cv={selected} isAdmin onSaved={(u) => setSelected(u)} />
          </div>
        ) : (
          <>
            {view === "cvs" && (
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

            {view === "feedback" && (
              <div data-testid="admin-feedback-list">
                <h3 className="font-heading font-bold text-lg mb-4">Feedback & Support ({feedback.length})</h3>
                {feedback.length === 0 ? (
                  <div className="text-center py-16 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl">No feedback submitted yet.</div>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((f) => (
                      <div key={f.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-4" data-testid={`admin-feedback-${f.id}`}>
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0066FF]/15 text-[#4d94ff] border border-[#0066FF]/30">{f.category}</span>
                          <span className="text-[11px] font-data text-[#8A8F9E]">{f.mobile} · {f.created_at ? new Date(f.created_at).toLocaleString() : ""}</span>
                        </div>
                        <p className="text-sm text-[#F3F4F6]">{f.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
