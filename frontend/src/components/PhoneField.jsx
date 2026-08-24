import { useEffect, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./phone-field.css";
import { detectCountry } from "@/lib/detectCountry";

// International phone input with auto country/dial-code detection.
// Renders immediately with a sensible default (cached country or India) and
// upgrades to the detected country once available — so a slow/blackholed
// geolocation lookup can never block sign-in. Emits E.164 (e.g. +919930867220).
export const PhoneField = ({ value, onChange, onEnter, testId = "phone-input" }) => {
  const [country, setCountry] = useState(() => {
    const s = localStorage.getItem("mc_country");
    return s && /^[A-Z]{2}$/.test(s) ? s : "IN";
  });

  useEffect(() => {
    let mounted = true;
    detectCountry().then((c) => {
      // only auto-switch before the user has typed anything
      if (mounted && c && !value) setCountry(c);
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mc-phone" data-testid={testId}>
      <PhoneInput
        key={country}
        international
        countryCallingCodeEditable={false}
        defaultCountry={country}
        value={value || undefined}
        onChange={(v) => onChange(v || "")}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        numberInputProps={{ "data-testid": `${testId}-number` }}
      />
    </div>
  );
};
