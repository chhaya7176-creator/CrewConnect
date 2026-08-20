import { Link, useNavigate } from "react-router-dom";
import { Anchor, LayoutDashboard, LogOut, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export const Navbar = ({ onLogin }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl bg-[#12131A]/70 border-b border-white/10"
      data-testid="navbar"
    >
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-lg bg-[#FF5A00] flex items-center justify-center group-hover:-translate-y-0.5 transition-transform">
            <Anchor className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="font-heading font-extrabold text-lg tracking-tight">SMART CREWING</div>
            <div className="text-[10px] font-data text-[#8A8F9E] tracking-widest uppercase">Crew · Match · Sail</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.is_admin && (
                <Button
                  variant="ghost"
                  className="text-[#DFFF00] hover:bg-white/5 hover:text-[#DFFF00] gap-2"
                  onClick={() => navigate("/admin")}
                  data-testid="nav-admin-btn"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-[#F3F4F6] hover:bg-white/5 hover:text-white gap-2"
                onClick={() => navigate("/dashboard")}
                data-testid="nav-dashboard-btn"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button
                variant="ghost"
                className="text-[#8A8F9E] hover:bg-white/5 hover:text-white gap-2"
                onClick={logout}
                data-testid="nav-logout-btn"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </>
          ) : (
            <Button
              className="bg-[#FF5A00] hover:bg-[#E04F00] text-white rounded-full gap-2 hover:-translate-y-0.5 transition-transform"
              onClick={onLogin}
              data-testid="nav-login-btn"
            >
              <LogIn className="w-4 h-4" /> Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
