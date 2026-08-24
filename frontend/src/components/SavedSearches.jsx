import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bookmark, Trash2, MessageCircle, IndianRupee, Unlock } from "lucide-react";
import { buildContactMessage, waLink } from "@/lib/waMessage";

const Empty = ({ text }) => (
  <div className="text-center py-12 text-[#8A8F9E] text-sm border border-dashed border-white/10 rounded-xl">{text}</div>
);

const Info = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-[#8A8F9E]">{label}</div>
    <div className="text-sm font-data mt-0.5">{value}</div>
  </div>
);

export const SavedSearches = ({ onChange }) => {
  const [list, setList] = useState(null);
  const [req, setReq] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [results, setResults] = useState({});
  const [freeLeft, setFreeLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/saved-searches").then((r) => setList(r.data.searches)).catch(() => setList([]));

  useEffect(() => {
    load();
    api.get("/matches").then((r) => setReq(r.data.requirement)).catch(() => {});
  }, []);

  const saveCurrent = async () => {
    if (!req) { toast.error("Post a requirement in the chat first"); return; }
    setBusy(true);
    try {
      const criteria = {
        rank: req.rank, vessel_type: req.vessel_type, sea_time: req.sea_time,
        sea_time_priority: req.sea_time_priority, coc: req.coc, coc_priority: req.coc_priority, us_visa: req.us_visa,
      };
      await api.post("/saved-searches", { name: `${req.rank} · ${req.vessel_type}`, criteria });
      toast.success("Search saved");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save search");
    } finally {
      setBusy(false);
    }
  };

  const view = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    const r = await api.get(`/saved-searches/${id}/results`);
    setResults((m) => ({ ...m, [id]: r.data.results }));
    setFreeLeft(r.data.free_unlocks_left ?? 0);
    load();
  };

  const del = async (id) => { await api.delete(`/saved-searches/${id}`); toast.success("Search removed"); load(); };

  const unlock = async (sid, seekerId) => {
    try {
      const r = await api.post("/unlock-cv", { seeker_id: seekerId });
      toast.success(r.data.amount ? "CV unlocked! (₹49 — demo)" : "CV unlocked — free!");
      const rr = await api.get(`/saved-searches/${sid}/results`);
      setResults((m) => ({ ...m, [sid]: rr.data.results }));
      setFreeLeft(rr.data.free_unlocks_left ?? 0);
      onChange?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Unlock failed");
    }
  };

  if (list === null) return <Empty text="Loading saved searches..." />;

  return (
    <div data-testid="saved-searches">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="font-heading font-bold text-lg">Saved Searches</h3>
          <p className="text-xs text-[#8A8F9E]">Save a search and see the newest matching crew on top each visit.</p>
        </div>
        <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2" disabled={busy || !req} onClick={saveCurrent} data-testid="save-current-search-btn">
          <Bookmark className="w-4 h-4" /> Save current search
        </Button>
      </div>

      {!list.length ? (
        <Empty text="No saved searches yet. Save your current requirement to get alerts of new crew." />
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-[#0A0B12]" data-testid={`saved-${s.id}`}>
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1 min-w-[160px]">
                  <div className="font-heading font-bold">{s.name}</div>
                  <div className="text-xs text-[#8A8F9E]">
                    {s.criteria.rank} · {s.criteria.vessel_type} · {s.criteria.sea_time} · {(Array.isArray(s.criteria.coc) ? s.criteria.coc.join(", ") : s.criteria.coc)}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10" data-testid={`saved-count-${s.id}`}>{s.count} crew</span>
                {s.new_count > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[#DFFF00] text-black font-bold" data-testid={`saved-new-${s.id}`}>{s.new_count} new</span>
                )}
                <Button size="sm" variant="outline" className="rounded-full border-white/15 bg-transparent" onClick={() => view(s.id)} data-testid={`view-search-${s.id}`}>
                  {openId === s.id ? "Hide" : "View"}
                </Button>
                <Button size="sm" variant="ghost" className="text-[#ff6b6b]" aria-label="Delete saved search" onClick={() => { if (window.confirm("Delete this saved search?")) del(s.id); }} data-testid={`del-search-${s.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {openId === s.id && (
                <div className="border-t border-white/10 p-4">
                  {!(results[s.id]?.length) ? (
                    <Empty text="No matching crew for this search yet." />
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {results[s.id].map((c) => (
                        <div key={c.id} className="rounded-xl border border-white/10 bg-[#12131A] p-4" data-testid={`result-${c.id}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-heading font-bold">{c.rank}</div>
                            {c.is_new && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DFFF00] text-black font-bold">NEW</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <Info label="Vessel" value={c.vessel_type} />
                            <Info label="Sea time" value={c.sea_time} />
                            <Info label="COC" value={c.coc} />
                            <Info label="US Visa" value={c.us_visa} />
                          </div>
                          {c.match_reasons?.length ? (
                            <div className="flex flex-wrap gap-1 mb-3" data-testid={`result-reasons-${c.id}`}>
                              {c.match_reasons.map((r) => (
                                <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 font-medium">{r} ✓</span>
                              ))}
                            </div>
                          ) : null}
                          {c.unlocked ? (
                            <Button
                              size="sm"
                              className="w-full bg-[#25D366] hover:bg-[#1da851] text-black font-semibold gap-2 rounded-full"
                              onClick={() => window.open(waLink(c.mobile, buildContactMessage({ crewName: c.name, position: c.rank, companyEmail: req?.email, companyName: req?.company_name })), "_blank")}
                              data-testid={`result-wa-${c.id}`}
                            >
                              <MessageCircle className="w-4 h-4" /> {c.name}
                            </Button>
                          ) : (
                            <>
                              <p className="text-[10px] text-[#8A8F9E] mb-1.5">Name &amp; contact hidden until unlocked</p>
                              <Button
                                size="sm"
                                className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
                                onClick={() => unlock(s.id, c.id)}
                                data-testid={`result-unlock-${c.id}`}
                              >
                                {freeLeft > 0 ? <Unlock className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                                {freeLeft > 0 ? `Unlock free · ${freeLeft} left` : "Unlock full CV · ₹49"}
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
