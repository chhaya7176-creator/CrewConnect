import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { LoginDialog } from "@/components/LoginDialog";
import { Matches } from "@/components/Matches";
import { Documents } from "@/components/Documents";
import { StandardCV } from "@/components/StandardCV";
import { Movement } from "@/components/Movement";
import { SavedSearches } from "@/components/SavedSearches";
import { FeedbackCard } from "@/components/FeedbackCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, FileText, Navigation, History, Rocket, IndianRupee, MessageSquareWarning, FileScan, Globe, ClipboardList, Bookmark, Pencil } from "lucide-react";
import { EditPostDialog } from "@/components/EditPostDialog";
import { DataRights } from "@/components/DataRights";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [data, setData] = useState(null);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch {
      /* not logged in */
    }
  };

  useEffect(() => {
    if (!loading && !user) setLoginOpen(true);
    if (user) loadDashboard();
    // eslint-disable-next-line
  }, [user, loading]);

  const boost = async () => {
    try {
      await api.post("/get-noticed/pay");
      toast.success("You're now promoted! (₹499 — demo)");
      loadDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not upgrade");
    }
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-[#05050A]">
        <Navbar onLogin={() => setLoginOpen(true)} />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSuccess={loadDashboard} />
        <div className="max-w-md mx-auto text-center py-32 px-6">
          <h2 className="font-heading font-extrabold text-3xl mb-3">Your private dashboard</h2>
          <p className="text-[#8A8F9E] mb-6">Log in with your mobile number to view your history, documents and matches.</p>
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full" onClick={() => setLoginOpen(true)} data-testid="dash-login-btn">Login</Button>
        </div>
      </div>
    );
  }

  const seekerProfile = data?.seeker_profiles?.[data.seeker_profiles.length - 1];
  const providerReq = data?.provider_requirements?.[data.provider_requirements.length - 1];
  const isSeeker = !!seekerProfile && !providerReq;

  return (
    <div className="min-h-screen bg-[#05050A]">
      <Navbar onLogin={() => setLoginOpen(true)} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSuccess={loadDashboard} />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-data text-[#8A8F9E] uppercase tracking-widest mb-1">My Space</div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl">
              {providerReq ? providerReq.company_name : seekerProfile?.name || "Welcome"}
            </h1>
            <div className="text-sm text-[#8A8F9E] font-data mt-1">{user?.mobile}</div>
          </div>
          {seekerProfile && (
            <Button
              onClick={boost}
              className="bg-[#DFFF00] hover:bg-[#c8e600] text-black font-semibold rounded-full gap-2 hover:-translate-y-0.5 transition-transform"
              data-testid="boost-btn"
            >
              <Rocket className="w-4 h-4" />
              {seekerProfile.boosted ? "Promoted ✓" : "Get Noticed Faster · ₹499"}
            </Button>
          )}
        </div>

        {/* Overview stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label={providerReq ? "Requirements" : "Profiles"} value={(data?.seeker_profiles?.length || 0) + (data?.provider_requirements?.length || 0)} />
          <StatCard icon={FileText} label="Documents" value={data?.documents_count ?? "—"} accent />
          <StatCard icon={IndianRupee} label="CVs Unlocked" value={data?.unlocks?.length || 0} />
          <StatCard icon={History} label="Payments" value={data?.payments?.length || 0} />
        </div>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="bg-[#0A0B12] border border-white/10 flex-wrap h-auto p-1">
            <TabTrig value="matches" icon={Users}>Matches</TabTrig>
            <TabTrig value="browse" icon={Globe}>{providerReq ? "All Crew" : "All Vacancies"}</TabTrig>
            {providerReq && <TabTrig value="saved" icon={Bookmark}>Saved Searches</TabTrig>}
            <TabTrig value="posts" icon={ClipboardList}>My Posts</TabTrig>
            <TabTrig value="documents" icon={FileText}>Documents</TabTrig>
            <TabTrig value="cv" icon={FileScan}>Standard CV</TabTrig>
            <TabTrig value="movement" icon={Navigation}>Availability</TabTrig>
            <TabTrig value="history" icon={History}>History</TabTrig>
            <TabTrig value="support" icon={MessageSquareWarning}>Support</TabTrig>
          </TabsList>

          <TabsContent value="matches" className="mt-6">
            <Matches onChange={loadDashboard} />
          </TabsContent>
          <TabsContent value="browse" className="mt-6">
            <Matches browse onChange={loadDashboard} />
          </TabsContent>
          {providerReq && (
            <TabsContent value="saved" className="mt-6">
              <SavedSearches onChange={loadDashboard} />
            </TabsContent>
          )}
          <TabsContent value="posts" className="mt-6">
            <MyPosts data={data} onChange={loadDashboard} />
          </TabsContent>
          <TabsContent value="documents" className="mt-6">
            <Documents onChange={loadDashboard} />
          </TabsContent>
          <TabsContent value="cv" className="mt-6">
            <StandardCV />
          </TabsContent>
          <TabsContent value="movement" className="mt-6">
            <Movement />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <HistoryView data={data} />
          </TabsContent>
          <TabsContent value="support" className="mt-6 space-y-6">
            <FeedbackCard />
            <DataRights />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className={`p-5 rounded-xl border bg-[#0A0B12] ${accent ? "border-[#FF5A00]/40" : "border-white/10"}`} data-testid={`stat-${label}`}>
    <Icon className={`w-5 h-5 mb-3 ${accent ? "text-[#FF5A00]" : "text-[#0066FF]"}`} />
    <div className="font-heading font-extrabold text-3xl font-data">{value}</div>
    <div className="text-xs text-[#8A8F9E] mt-1">{label}</div>
  </div>
);

const TabTrig = ({ value, icon: Icon, children }) => (
  <TabsTrigger
    value={value}
    className="data-[state=active]:bg-[#FF5A00] data-[state=active]:text-white text-[#8A8F9E] gap-2 rounded-lg"
    data-testid={`tab-${value}`}
  >
    <Icon className="w-4 h-4" /> {children}
  </TabsTrigger>
);

const HistoryView = ({ data }) => {
  const items = [
    ...(data?.seeker_profiles || []).map((s) => ({ type: "Seeker profile", label: `${s.rank} · ${s.vessel_type}`, at: s.created_at })),
    ...(data?.provider_requirements || []).map((p) => ({ type: "Requirement", label: `${p.rank} · ${p.vessel_type}`, at: p.created_at })),
    ...(data?.unlocks || []).map((u) => ({ type: "CV Unlocked (₹49)", label: `Candidate ${u.seeker_id.slice(0, 6)}`, at: u.at })),
    ...(data?.payments || []).map((p) => ({ type: `Payment (₹${p.amount})`, label: p.type, at: p.at })),
  ].sort((a, b) => (b.at || "").localeCompare(a.at || ""));

  if (!items.length) return <Empty text="No history yet. Complete a profile to get started." />;
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" data-testid="history-list">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors">
          <div>
            <div className="text-sm font-medium">{it.type}</div>
            <div className="text-xs text-[#8A8F9E]">{it.label}</div>
          </div>
          <div className="text-xs font-data text-[#8A8F9E]">{it.at ? new Date(it.at).toLocaleString() : ""}</div>
        </div>
      ))}
    </div>
  );
};

const MyPosts = ({ data, onChange }) => {
  const reqs = data?.provider_requirements || [];
  const profs = data?.seeker_profiles || [];
  const isCompany = reqs.length > 0;
  const items = isCompany ? reqs : profs;
  const [editing, setEditing] = useState(null);
  if (!items.length) return <Empty text="You haven't posted anything yet. Start in the chat on the home page." />;
  return (
    <>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="my-posts">
      {items.map((p) => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-[#0A0B12] p-5" data-testid={`post-${p.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-heading font-bold">{isCompany ? p.company_name : p.name}</div>
              <div className="text-xs text-[#8A8F9E] mb-3">{p.rank} · {p.vessel_type}</div>
            </div>
            <Button size="sm" variant="outline" className="rounded-full border-white/15 bg-transparent hover:bg-white/5 gap-1.5 h-8 px-3 text-xs shrink-0" onClick={() => setEditing(p)} data-testid={`edit-post-btn-${p.id}`}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-[#8A8F9E] text-[10px] uppercase">Sea time</span><div className="font-data">{p.sea_time}</div></div>
            <div><span className="text-[#8A8F9E] text-[10px] uppercase">COC</span><div className="font-data">{Array.isArray(p.coc) ? p.coc.join(", ") : p.coc}</div></div>
            <div><span className="text-[#8A8F9E] text-[10px] uppercase">US Visa</span><div className="font-data">{p.us_visa}</div></div>
            <div><span className="text-[#8A8F9E] text-[10px] uppercase">Availability</span><div className="font-data">{p.availability}</div></div>
          </div>
          {p.boosted && <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full bg-[#DFFF00] text-black font-bold">BOOSTED</span>}
          <div className="text-[10px] text-[#8A8F9E] mt-3 font-data">Posted {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</div>
        </div>
      ))}
    </div>
    <EditPostDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} post={editing} isCompany={isCompany} onSaved={onChange} />
    </>
  );
};

export const Empty = ({ text }) => (
  <div className="text-center py-16 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl">{text}</div>
);
