import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Anchor, Send, Sparkles, Share2, LayoutDashboard, CheckCircle2, Ship, Building2 } from "lucide-react";
import { formatDateInput } from "@/lib/formatDate";

const uid = () => Math.random().toString(36).slice(2);

const buildSeekerSteps = (cfg) => [
  { key: "rank", bot: "What is your professional rank?", type: "dropdown", options: cfg.ranks },
  { key: "vessel_type", bot: "Which vessel type do you prefer to work on?", type: "dropdown", options: cfg.vessel_types },
  { key: "sea_time", bot: "How much sea time do you have (in months)?", type: "quick", options: cfg.sea_time },
  { key: "coc", bot: "Which country/authority issued your Certificate / License / COC?", type: "dropdown", options: cfg.coc_seeker },
  { key: "us_visa", bot: "What is your US Visa status?", type: "quick", options: cfg.us_visa_seeker },
  { key: "other_visa", bot: "Any other visa details? e.g. Schengen, UK. (Optional)", type: "text", optional: true, placeholder: "Type details or press Skip" },
  { key: "mobile", bot: "Enter your mobile number with country code for OTP verification.", type: "mobile", placeholder: "+91XXXXXXXXXX" },
  { key: "otp", bot: "Enter the 6-digit OTP you received.", type: "otp" },
  { key: "consent", bot: "Do you agree to share your details with relevant employers?", type: "quick", options: ["Yes", "No"] },
  { key: "name", bot: "Great! What is your full name?", type: "text", placeholder: "Full name" },
  { key: "email", bot: "Your email ID for job notifications?", type: "text", placeholder: "you@example.com" },
  { key: "availability", bot: "When are you available to join?", type: "quick", options: ["Immediate", "Custom date"] },
  { key: "review", bot: "Here is your AI-generated profile. Review, edit if needed, and submit.", type: "review" },
];

const buildProviderSteps = (cfg) => [
  { key: "rank", bot: "Which rank are you hiring for?", type: "dropdown", options: cfg.ranks },
  { key: "vessel_type", bot: "Which vessel type is this for?", type: "dropdown", options: cfg.vessel_types },
  { key: "sea_time", bot: "Minimum sea time experience required?", type: "quick", options: cfg.sea_time },
  { key: "sea_time_priority", bot: "Is this experience duration Mandatory or Preferred?", type: "quick", options: ["Mandatory", "Preferred"] },
  { key: "coc", bot: "Which COC issuing countries/authorities are acceptable? (Select one or more)", type: "multiselect", options: cfg.coc_provider },
  { key: "coc_priority", bot: "Is this COC requirement Mandatory or Preferred?", type: "quick", options: ["Mandatory", "Preferred"] },
  { key: "us_visa", bot: "US Visa requirement for this role?", type: "quick", options: cfg.us_visa_provider },
  { key: "us_visa_priority", bot: "Is the US Visa requirement Mandatory or Preferred?", type: "quick", options: ["Mandatory", "Preferred"] },
  { key: "mobile", bot: "Enter your mobile number with country code for OTP verification.", type: "mobile", placeholder: "+91XXXXXXXXXX" },
  { key: "otp", bot: "Enter the 6-digit OTP you received.", type: "otp" },
  { key: "consent", bot: "Do you agree to share your requirement with relevant seafarers?", type: "quick", options: ["Yes", "No"] },
  { key: "company_name", bot: "What is your company name?", type: "text", placeholder: "Company name" },
  { key: "email", bot: "Company email for candidate notifications?", type: "text", placeholder: "crewing@company.com" },
  { key: "availability", bot: "Required joining timeline?", type: "quick", options: ["Immediate", "Custom date"] },
  { key: "availability_priority", bot: "Is this readiness / availability Mandatory or Preferred?", type: "quick", options: ["Mandatory", "Preferred"] },
  { key: "review", bot: "Here is your AI-generated requirement summary. Review, edit and submit.", type: "review" },
];

export const ChatFlow = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [role, setRole] = useState(null);
  const [flow, setFlow] = useState([]);
  const [idx, setIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({});
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [multi, setMulti] = useState([]);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [done, setDone] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/config").then((r) => setCfg(r.data));
  }, []);

  useEffect(() => {
    setMessages([
      { id: uid(), from: "bot", text: "⚓ Welcome to Smart Crewing! I'll help you get matched in under 2 minutes. Tap a box below to begin:" },
    ]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, done]);

  const addBot = (text) => setMessages((m) => [...m, { id: uid(), from: "bot", text }]);
  const addUser = (text) => setMessages((m) => [...m, { id: uid(), from: "user", text }]);

  const pushBotStep = (step) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addBot(step.bot);
    }, 500);
  };

  const startRole = (r) => {
    addUser(r === "seeker" ? "I'm looking for a job" : "I'm hiring crew");
    setRole(r);
    const steps = r === "seeker" ? buildSeekerSteps(cfg) : buildProviderSteps(cfg);
    setFlow(steps);
    setIdx(0);
    pushBotStep(steps[0]);
  };

  const advance = (curFlow, curIdx) => {
    const next = curIdx + 1;
    if (next >= curFlow.length) return;
    setIdx(next);
    pushBotStep(curFlow[next]);
  };

  const genSummary = async (data) => {
    setLoadingSummary(true);
    try {
      const res = await api.post("/ai/summary", { role, data });
      setSummary(res.data.summary);
    } catch {
      setSummary("Profile summary unavailable.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const step = flow[idx];

  const roleBoxes = (
    <div className="grid grid-cols-2 gap-3 animate-fade-up" data-testid="role-select">
      <button
        onClick={() => startRole("seeker")}
        className="role-blink group p-4 rounded-xl border-2 border-[#FF5A00] bg-black/20 hover:bg-[#FF5A00]/10 hover:-translate-y-1 transition-transform text-left"
        data-testid="role-seeker-btn"
      >
        <Ship className="w-6 h-6 text-[#FF5A00] mb-2" />
        <div className="font-semibold text-sm">I'm a Seafarer</div>
        <div className="text-xs text-[#8A8F9E]">Looking for a shipping job</div>
      </button>
      <button
        onClick={() => startRole("provider")}
        className="role-blink-blue group p-4 rounded-xl border-2 border-[#0066FF] bg-black/20 hover:bg-[#0066FF]/10 hover:-translate-y-1 transition-transform text-left"
        data-testid="role-provider-btn"
      >
        <Building2 className="w-6 h-6 text-[#0066FF] mb-2" />
        <div className="font-semibold text-sm">I'm Hiring Crew</div>
        <div className="text-xs text-[#8A8F9E]">Company / job provider</div>
      </button>
    </div>
  );

  const handleValue = async (value, label) => {
    const s = step;
    addUser(label ?? value);

    // conditional: COC Others (seeker) -> ask free text
    if (s.key === "coc" && value === "Others") {
      const newForm = { ...form, coc: "" };
      setForm(newForm);
      const newFlow = [...flow];
      newFlow.splice(idx + 1, 0, { key: "coc_other", bot: "Please specify the issuing country/authority.", type: "text", placeholder: "Country / authority" });
      setFlow(newFlow);
      advance(newFlow, idx);
      return;
    }
    // conditional: custom availability date
    if (s.key === "availability" && value === "Custom date") {
      const newFlow = [...flow];
      newFlow.splice(idx + 1, 0, { key: "availability_date", bot: "Enter the date (DD/MM/YYYY).", type: "text", placeholder: "DD/MM/YYYY", format: "date" });
      setFlow(newFlow);
      advance(newFlow, idx);
      return;
    }

    // map special keys
    let key = s.key;
    let val = value;
    if (s.key === "coc_other") key = "coc";
    if (s.key === "availability_date") key = "availability";

    const newForm = { ...form, [key]: val };
    setForm(newForm);

    // consent No -> reconsider
    if (s.key === "consent" && value === "No") {
      addBot("No problem. Sharing your details helps us match you faster. Tap 'Yes' when you're ready, or you can close this chat.");
      return;
    }

    // mobile -> send OTP
    if (s.key === "mobile") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        addBot("⚠️ Please enter a valid mobile number (10–15 digits with country code).");
        return;
      }
      try {
        const res = await api.post("/auth/request-otp", { mobile: value });
        advance(flow, idx);
        setTimeout(() => addBot(`(Demo mode) Your OTP is *${res.data.demo_otp}*`), 700);
      } catch (e) {
        addBot("⚠️ " + (e.response?.data?.detail || "Failed to send OTP."));
      }
      return;
    }

    // OTP -> verify + login
    if (s.key === "otp") {
      try {
        const res = await api.post("/auth/verify-otp", { mobile: form.mobile, otp: value });
        login(res.data.token, res.data.user);
        toast.success("Mobile verified");
        advance(flow, idx);
      } catch (e) {
        addBot("⚠️ " + (e.response?.data?.detail || "Invalid OTP, try again."));
      }
      return;
    }

    // email validation
    if (s.key === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      addBot("⚠️ Please enter a valid email address.");
      return;
    }

    // reaching review -> generate summary
    const next = flow[idx + 1];
    if (next && next.type === "review") {
      advance(flow, idx);
      genSummary(newForm);
      return;
    }

    advance(flow, idx);
  };

  const submitProfile = async () => {
    const payload = { ...form, summary, consent: true };
    if (role === "provider") payload.coc = multi.length ? multi : (Array.isArray(form.coc) ? form.coc : [form.coc]);
    try {
      const endpoint = role === "seeker" ? "/seeker/profile" : "/provider/requirement";
      const res = await api.post(endpoint, payload);
      const link = `${window.location.origin}/?ref=${res.data.referral_code}`;
      setDone({ link, referral: res.data.referral_code });
      addUser("Submit ✓");
      setTimeout(() => {
        addBot(role === "seeker"
          ? "✅ Your details have been submitted successfully and will be shared with relevant employers!"
          : "✅ Your requirements have been submitted successfully and will be shared with relevant seafarers!");
      }, 400);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Submission failed");
    }
  };

  const renderInput = () => {
    if (done) {
      return (
        <div className="space-y-3" data-testid="chat-done-panel">
          <div className="p-4 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/40">
            <div className="flex items-center gap-2 text-[#4d94ff] font-semibold text-sm mb-1">
              <Share2 className="w-4 h-4" /> Unlock free visibility
            </div>
            <p className="text-xs text-[#8A8F9E] mb-3">
              Share this link with 2 WhatsApp groups OR 10 contacts to make your{" "}
              {role === "seeker" ? "profile" : "requirement"} visible for free.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={done.link} className="bg-black/40 border-white/10 font-data text-xs" data-testid="referral-link" />
              <Button
                size="sm"
                className="bg-[#25D366] hover:bg-[#1da851] text-black font-semibold shrink-0"
                onClick={() => {
                  const text = encodeURIComponent(`Join me on Smart Crewing — get matched with shipping ${role === "seeker" ? "jobs" : "crew"}! ${done.link}`);
                  window.open(`https://wa.me/?text=${text}`, "_blank");
                }}
                data-testid="share-whatsapp-btn"
              >
                <Share2 className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
            </div>
          </div>
          <Button
            className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
            onClick={() => navigate("/dashboard")}
            data-testid="goto-dashboard-btn"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to my Dashboard
          </Button>
        </div>
      );
    }

    if (!role) return null;

    if (!step) return null;

    if (step.type === "quick") {
      return (
        <div className="flex flex-wrap gap-2" data-testid="quick-replies">
          {step.options.map((o) => (
            <button
              key={o}
              onClick={() => handleValue(o)}
              className="px-4 py-2 rounded-full border border-[#0066FF] text-[#4d94ff] text-sm hover:bg-[#0066FF] hover:text-white transition-colors"
              data-testid={`quick-${o}`}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "dropdown") {
      return (
        <div className="flex gap-2">
          <Select onValueChange={(v) => handleValue(v)}>
            <SelectTrigger className="bg-black/30 border-white/10 focus:ring-2 focus:ring-[#FF5A00]" data-testid="chat-dropdown">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6] max-h-64">
              {step.options.map((o) => (
                <SelectItem key={o} value={o} data-testid={`opt-${o}`}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (step.type === "multiselect") {
      return (
        <div className="space-y-3" data-testid="chat-multiselect">
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
            {step.options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={multi.includes(o)}
                  onCheckedChange={(c) => setMulti((m) => (c ? [...m, o] : m.filter((x) => x !== o)))}
                  className="border-white/30 data-[state=checked]:bg-[#FF5A00] data-[state=checked]:border-[#FF5A00]"
                  data-testid={`multi-${o}`}
                />
                {o}
              </label>
            ))}
          </div>
          <Button
            size="sm"
            className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full"
            disabled={!multi.length}
            onClick={() => handleValue(multi, multi.join(", "))}
            data-testid="multiselect-confirm"
          >
            Confirm ({multi.length})
          </Button>
        </div>
      );
    }

    if (step.type === "review") {
      return (
        <div className="space-y-3" data-testid="chat-review">
          <div className="flex items-center gap-2 text-[#DFFF00] text-xs font-semibold">
            <Sparkles className="w-4 h-4" /> AI-generated summary
          </div>
          <Textarea
            className="bg-black/30 border-white/10 min-h-[110px] focus:ring-2 focus:ring-[#FF5A00]"
            value={loadingSummary ? "Generating your profile summary..." : summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={loadingSummary}
            data-testid="summary-textarea"
          />
          <Button
            className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2"
            disabled={loadingSummary || !summary}
            onClick={submitProfile}
            data-testid="submit-profile-btn"
          >
            <CheckCircle2 className="w-4 h-4" /> Submit
          </Button>
        </div>
      );
    }

    // text / mobile / otp
    const isOtp = step.type === "otp";
    const isMobile = step.type === "mobile";
    return (
      <div className="flex gap-2">
        <Input
          className="bg-black/30 border-white/10 focus:ring-2 focus:ring-[#FF5A00] font-data"
          placeholder={step.placeholder || "Type your answer"}
          value={input}
          maxLength={isOtp ? 6 : (step.format === "date" ? 10 : undefined)}
          onChange={(e) => {
            const v = e.target.value;
            if (isOtp) setInput(v.replace(/\D/g, ""));
            else if (isMobile) setInput(v.replace(/[^\d+]/g, ""));
            else if (step.format === "date") setInput(formatDateInput(v));
            else setInput(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (input || step.optional)) {
              handleValue(input);
              setInput("");
            }
          }}
          data-testid="chat-text-input"
        />
        {step.optional && (
          <Button variant="ghost" className="text-[#8A8F9E] hover:text-white" onClick={() => { handleValue("", "Skip"); setInput(""); }} data-testid="chat-skip-btn">
            Skip
          </Button>
        )}
        <Button
          className="bg-[#FF5A00] hover:bg-[#E04F00] shrink-0"
          disabled={!input && !step.optional}
          onClick={() => { handleValue(input); setInput(""); }}
          data-testid="chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-white/10 bg-[#0A0B12]">
      {/* chat header */}
      <div className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl bg-[#12131A]/80 border-b border-white/10 z-10">
        <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
          <Anchor className="w-5 h-5 text-black" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm">Smart Crewing Bot</div>
          <div className="text-[11px] text-[#25D366] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> online
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 grid-texture" data-testid="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
            <div
              className={
                m.from === "user"
                  ? "bg-[#FF5A00] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%] shadow"
                  : "bg-[#12131A] text-[#F3F4F6] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] shadow"
              }
              dangerouslySetInnerHTML={{ __html: m.text.replace(/\*(.*?)\*/g, "<b>$1</b>") }}
            />
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-[#12131A] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8A8F9E] typing-dot" />
              <span className="w-2 h-2 rounded-full bg-[#8A8F9E] typing-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-[#8A8F9E] typing-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        {!role && !done && <div className="pt-1">{roleBoxes}</div>}
        {role && cfg && (
          <div className="pt-2 animate-fade-up" data-testid="chat-input-inline">
            {renderInput()}
          </div>
        )}
      </div>
    </div>
  );
};
