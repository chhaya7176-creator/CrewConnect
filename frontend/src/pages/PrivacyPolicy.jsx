import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-7">
    <h2 className="font-heading font-bold text-lg text-white mb-2">{title}</h2>
    <div className="text-sm text-[#C9CFDA] leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function PrivacyPolicy() {
  const [officer, setOfficer] = useState(null);
  useEffect(() => { api.get("/grievance").then((r) => setOfficer(r.data.grievance_officer)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-[#05050A]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10" data-testid="privacy-page">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#8A8F9E] hover:text-white mb-5" data-testid="privacy-back">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2 text-[#DFFF00] text-xs font-data uppercase tracking-widest mb-1">
          <ShieldCheck className="w-4 h-4" /> DPDP Notice
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl mb-2">Privacy Policy & Data Protection</h1>
        <p className="text-xs text-[#8A8F9E] mb-8">Digital Personal Data Protection Act, 2023 (India) · Consent version 1.0</p>

        <Section title="Who we are">
          <p>Smart Crewing ("we") is a platform that matches seafarers with shipping companies. We act as a Data Fiduciary for the personal data you provide.</p>
        </Section>
        <Section title="What we collect & why (purpose limitation)">
          <p>We collect only what is needed to match you and notify you of opportunities:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mobile number & OTP — to verify identity and log you in.</li>
            <li>Date of birth — to confirm you are 18+.</li>
            <li>Rank, vessel type, sea time, COC, visa status, availability — to match jobs/candidates.</li>
            <li>Name, email & uploaded CV/certificates — shared with an employer only when they unlock your profile, or with candidates for a company requirement.</li>
          </ul>
          <p>We do not sell your data or use it for unrelated purposes.</p>
        </Section>
        <Section title="Consent & withdrawal">
          <p>We process your personal data based on the consent you give during sign-up. You may <b className="text-white">withdraw consent</b> or <b className="text-white">request deletion</b> at any time from your Dashboard → Support → Privacy & Data. Withdrawing consent removes your profile from all listings.</p>
        </Section>
        <Section title="Your rights as a Data Principal">
          <ul className="list-disc pl-5 space-y-1">
            <li><b className="text-white">Access</b> — download a copy of your data (Dashboard → Support → Privacy & Data).</li>
            <li><b className="text-white">Correction</b> — edit your details anytime (Dashboard → My Posts → Edit, or the in-chat "Correct last answer").</li>
            <li><b className="text-white">Erasure</b> — request deletion; your records are withdrawn from public listings and moved to a restricted admin-only "Requested for deletion under DPDP" folder pending removal.</li>
            <li><b className="text-white">Grievance redressal</b> — contact our Grievance Officer below.</li>
          </ul>
        </Section>
        <Section title="Data retention">
          <p>Inactive accounts are retained so you can return and continue matching. When you explicitly request deletion, your data is immediately removed from public view and held only for admin review before removal.</p>
        </Section>
        <Section title="Children">
          <p>Smart Crewing is intended for users aged 18 and above. We ask for date of birth at sign-up and do not knowingly onboard minors.</p>
        </Section>
        <Section title="Security">
          <p>Access to full contact details is gated, and personal data is transmitted over HTTPS. We restrict internal access and act on any data-breach in line with applicable law.</p>
        </Section>

        <div className="rounded-2xl border border-[#0066FF]/40 bg-[#0066FF]/5 p-5" data-testid="grievance-officer">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-[#4d94ff]" />
            <h3 className="font-heading font-bold text-white">Grievance Officer</h3>
          </div>
          <p className="text-sm text-[#C9CFDA]">{officer?.name || "Grievance Officer"} — {officer?.role || "Data Protection Contact"}</p>
          <a href={`mailto:${officer?.email || ""}`} className="text-sm font-semibold text-[#4d94ff] hover:underline" data-testid="grievance-email">{officer?.email}</a>
          <p className="text-xs text-[#8A8F9E] mt-2">We aim to acknowledge grievances promptly and resolve them within the timelines prescribed under the DPDP Act.</p>
        </div>
      </div>
    </div>
  );
}
