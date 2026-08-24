export const waLink = (mobile, text) => {
  const digits = String(mobile || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

// Prefilled WhatsApp message a company sends to an unlocked crew member.
export const buildContactMessage = ({ crewName, position, companyEmail, companyName }) =>
  `Hi ${(crewName || "there").trim()}, we found your profile on Smart Crewing for a ${(position || "seafarer").trim()} position.\n` +
  `Can you share your CV on my email ID (${(companyEmail || "—").trim()}) or here on WhatsApp?\n` +
  `Regards\n${(companyName || "Smart Crewing").trim()}`;
