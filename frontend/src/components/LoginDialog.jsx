import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Smartphone, ShieldCheck } from "lucide-react";

export const LoginDialog = ({ open, onOpenChange, onSuccess }) => {
  const { login } = useAuth();
  const [stage, setStage] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/request-otp", { mobile });
      toast.success(`OTP sent (demo): ${res.data.demo_otp}`);
      setStage("otp");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { mobile, otp });
      login(res.data.token, res.data.user);
      toast.success("Logged in successfully");
      onOpenChange(false);
      setStage("mobile");
      setMobile("");
      setOtp("");
      onSuccess?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]" data-testid="login-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading font-extrabold text-2xl">Welcome aboard</DialogTitle>
          <DialogDescription className="text-[#8A8F9E]">
            Log in with your mobile number to access your private dashboard.
          </DialogDescription>
        </DialogHeader>

        {stage === "mobile" ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Mobile number (with country code)</Label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3 top-3 text-[#8A8F9E]" />
                <Input
                  className="bg-black/30 border-white/10 pl-9 font-data focus:ring-2 focus:ring-[#FF5A00]"
                  placeholder="+91XXXXXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  data-testid="login-mobile-input"
                />
              </div>
            </div>
            <Button
              className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full"
              disabled={loading || mobile.length < 8}
              onClick={sendOtp}
              data-testid="login-send-otp-btn"
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Enter 6-digit OTP</Label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-3 text-[#8A8F9E]" />
                <Input
                  className="bg-black/30 border-white/10 pl-9 font-data tracking-[0.5em] focus:ring-2 focus:ring-[#FF5A00]"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  data-testid="login-otp-input"
                />
              </div>
            </div>
            <Button
              className="w-full bg-[#FF5A00] hover:bg-[#E04F00] rounded-full"
              disabled={loading || otp.length !== 6}
              onClick={verify}
              data-testid="login-verify-btn"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
