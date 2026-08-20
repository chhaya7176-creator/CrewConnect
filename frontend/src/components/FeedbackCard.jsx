import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { LifeBuoy, Send, MessageSquareWarning, Sparkles } from "lucide-react";

const CATS = ["Report an issue", "Suggest an improvement", "Onboarding help", "Matching help", "Payment query"];

export const FeedbackCard = () => {
  const [category, setCategory] = useState("Report an issue");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/feedback", { category, message });
      toast.success("Thanks! Our support team will get back to you.");
      setMessage("");
    } catch {
      toast.error("Could not submit feedback");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6" data-testid="support-panel">
      <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareWarning className="w-5 h-5 text-[#FF5A00]" />
          <h3 className="font-heading font-bold text-lg">Report an issue or share feedback</h3>
        </div>
        <div className="space-y-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-black/30 border-white/10" data-testid="feedback-category"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]">
              {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea className="bg-black/30 border-white/10 min-h-[130px]" placeholder="Tell us what's happening or how we can improve..." value={message} onChange={(e) => setMessage(e.target.value)} data-testid="feedback-message" />
          <Button className="bg-[#FF5A00] hover:bg-[#E04F00] rounded-full gap-2" disabled={sending || !message.trim()} onClick={submit} data-testid="feedback-submit">
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send to support"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0A0B12] p-6">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="w-5 h-5 text-[#0066FF]" />
          <h3 className="font-heading font-bold text-lg">Ongoing support</h3>
        </div>
        <ul className="space-y-4 text-sm text-[#8A8F9E]">
          <li className="flex gap-3"><Sparkles className="w-4 h-4 text-[#DFFF00] shrink-0 mt-0.5" /> AI-powered job & crew matching, refreshed continuously.</li>
          <li className="flex gap-3"><Sparkles className="w-4 h-4 text-[#DFFF00] shrink-0 mt-0.5" /> Notifications when a new match fits your profile or requirement.</li>
          <li className="flex gap-3"><Sparkles className="w-4 h-4 text-[#DFFF00] shrink-0 mt-0.5" /> Onboarding assistance for first-time seafarers and companies.</li>
          <li className="flex gap-3"><Sparkles className="w-4 h-4 text-[#DFFF00] shrink-0 mt-0.5" /> Secure document vault — your CV, COC and certificates in one place.</li>
        </ul>
      </div>
    </div>
  );
};
