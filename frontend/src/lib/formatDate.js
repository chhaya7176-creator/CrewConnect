// Auto-format free text into dd/mm/yyyy as the user types (slashes inserted automatically).
export const formatDateInput = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};
