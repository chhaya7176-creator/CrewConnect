import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { LoginDialog } from "@/components/LoginDialog";
import { ChatFlow } from "@/components/ChatFlow";
import { ShieldCheck, Zap, IndianRupee, Users, TrendingUp, FileCheck2 } from "lucide-react";

const HERO = "https://images.pexels.com/photos/18641968/pexels-photo-18641968.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const STATS = [
  { label: "Active Seafarers", value: "12,400+", icon: Users },
  { label: "Verified Companies", value: "860+", icon: ShieldCheck },
  { label: "Matches / week", value: "3,200", icon: TrendingUp },
];

const STEPS = [
  { icon: Zap, title: "Chat & fill", text: "Answer a few quick questions on our WhatsApp-style bot." },
  { icon: ShieldCheck, title: "Verify by OTP", text: "Secure your profile with mobile OTP verification." },
  { icon: FileCheck2, title: "AI profile", text: "Get an instant AI-written profile — edit and submit." },
  { icon: IndianRupee, title: "Match & unlock", text: "Companies unlock a full CV for ₹49. Seafarers unlock company contacts free by sharing — or a one-time ₹100." },
];

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#05050A]">
      <Navbar onLogin={() => setLoginOpen(true)} />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-6 lg:py-10 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8">
        {/* Left: branding */}
        <div className="order-2 lg:order-1">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6">
            <img src={HERO} alt="Cargo vessel" className="w-full h-56 sm:h-72 object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A00]/20 border border-[#FF5A00]/40 text-[#FF5A00] text-xs font-data uppercase tracking-widest mb-3">
                Crew · Match · Sail
              </div>
              <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[0.95] max-w-2xl">
                The fastest way to crew your vessel.
              </h1>
              <p className="text-[#8A8F9E] mt-3 max-w-xl text-base">
                Seafarers and shipping companies matched in minutes — right from a chat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {STATS.map((s) => (
              <div key={s.label} className="p-4 sm:p-6 rounded-xl border border-white/10 bg-[#0A0B12]" data-testid={`stat-${s.label}`}>
                <s.icon className="w-5 h-5 text-[#FF5A00] mb-3" />
                <div className="font-heading font-extrabold text-2xl sm:text-3xl font-data">{s.value}</div>
                <div className="text-xs text-[#8A8F9E] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <h2 className="font-heading font-bold text-lg mb-4 text-[#8A8F9E] uppercase tracking-wider">How it works</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-4 p-5 rounded-xl border border-white/10 bg-[#0A0B12] hover:border-white/20 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-[#0066FF]" />
                </div>
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span className="font-data text-[#FF5A00]">0{i + 1}</span> {s.title}
                  </div>
                  <div className="text-xs text-[#8A8F9E] mt-1">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat */}
        <div className="order-1 lg:order-2 h-[560px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-24">
          <ChatFlow />
        </div>
      </div>
    </div>
  );
}
