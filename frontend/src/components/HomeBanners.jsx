import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const HomeBanners = () => {
  const [banners, setBanners] = useState([]);
  useEffect(() => { api.get("/banners").then((r) => setBanners(r.data.banners || [])).catch(() => {}); }, []);
  if (!banners.length) return null;
  return (
    <div className="relative z-10 max-w-[1600px] mx-auto px-5 sm:px-8 pt-3 flex flex-wrap gap-3" data-testid="home-banners">
      {banners.map((b, i) => (
        <div key={i} className="flex-1 min-w-[240px] rounded-xl border border-[#FF5A00]/40 bg-[#FF5A00]/15 backdrop-blur-sm px-4 py-3" data-testid="home-banner">
          <div className="text-[10px] font-light text-[#FF7A2E] uppercase tracking-widest">Sponsored · {b.company_name}</div>
          <div className="font-heading font-bold text-white">{b.title}</div>
          {b.tagline && <div className="text-sm text-[#d3dae4]">{b.tagline}</div>}
        </div>
      ))}
    </div>
  );
};
