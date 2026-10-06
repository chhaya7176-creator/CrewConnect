import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const HomeBanners = () => {
  const [banners, setBanners] = useState([]);
  const navigate = useNavigate();
  useEffect(() => { api.get("/banners").then((r) => setBanners(r.data.banners || [])).catch(() => {}); }, []);
  if (!banners.length) return null;
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-5 sm:px-8 pt-3 flex flex-wrap gap-3" data-testid="home-banners">
      {banners.map((b, i) => (
        <button
          key={i}
          type="button"
          onClick={() => navigate(`/dashboard?company=${b.company_id}`)}
          className="group flex-1 min-w-[240px] text-left rounded-xl border border-[#FF5A00]/40 bg-[#FF5A00]/15 hover:bg-[#FF5A00]/25 hover:border-[#FF5A00]/70 backdrop-blur-sm px-4 py-3 cursor-pointer transition-all hover:-translate-y-0.5"
          data-testid="home-banner"
        >
          <div className="text-[10px] font-light text-[#FF7A2E] uppercase tracking-widest">Sponsored · {b.company_name}</div>
          <div className="font-heading font-bold text-white">{b.title}</div>
          {b.tagline && <div className="text-sm text-[#d3dae4]">{b.tagline}</div>}
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A2E] opacity-80 group-hover:opacity-100 group-hover:gap-2 transition-all">
            View their postings <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      ))}
    </div>
  );
};
