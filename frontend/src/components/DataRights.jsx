import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Download, Trash2, ShieldCheck, FileText } from "lucide-react";

export const DataRights = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const r = await api.get("/me/export");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "smart-crewing-my-data.json"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded");
    } catch {
      toast.error("Could not export your data");
    } finally { setBusy(false); }
  };

  const requestDeletion = async () => {
    try {
      await api.post("/me/request-deletion");
      toast.success("Deletion requested — your profile is now hidden and pending removal.");
      logout();
      navigate("/");
    } catch {
      toast.error("Could not submit request");
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A0B12] p-5 sm:p-6" data-testid="data-rights">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-[#DFFF00]" />
        <h3 className="font-heading font-bold text-lg">Privacy &amp; Data (DPDP)</h3>
      </div>
      <p className="text-sm text-[#8A8F9E] mb-5">
        Your rights under India's Digital Personal Data Protection Act. Read our{" "}
        <Link to="/privacy" className="text-[#4d94ff] hover:underline" data-testid="data-rights-privacy-link">Privacy Policy &amp; Grievance Officer</Link>.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-1 text-white font-semibold text-sm"><FileText className="w-4 h-4" /> Access your data</div>
          <p className="text-xs text-[#8A8F9E] mb-3">Download a machine-readable copy of the personal data we hold on you.</p>
          <Button variant="outline" className="w-full rounded-full border-white/15 bg-transparent hover:bg-white/5 gap-2" disabled={busy} onClick={download} data-testid="download-data-btn">
            <Download className="w-4 h-4" /> {busy ? "Preparing..." : "Download my data"}
          </Button>
        </div>

        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4">
          <div className="flex items-center gap-2 mb-1 text-[#ff6b6b] font-semibold text-sm"><Trash2 className="w-4 h-4" /> Delete my account</div>
          <p className="text-xs text-[#8A8F9E] mb-3">Withdraw consent and request erasure. Your profile is removed from all listings immediately.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full rounded-full gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white" data-testid="delete-account-btn">
                <Trash2 className="w-4 h-4" /> Request deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#12131A] border-white/10 text-[#F3F4F6]" data-testid="delete-confirm-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading font-extrabold">Request account deletion?</AlertDialogTitle>
                <AlertDialogDescription className="text-[#8A8F9E]">
                  Your profile, requirements and documents will be hidden from all listings immediately and moved to a restricted folder pending removal. You'll be logged out. This cannot be undone from here — contact the Grievance Officer to reverse it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full border-white/15 bg-transparent hover:bg-white/5" data-testid="delete-cancel-btn">Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-full bg-[#ef4444] hover:bg-[#dc2626]" onClick={requestDeletion} data-testid="delete-confirm-btn">Yes, request deletion</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
