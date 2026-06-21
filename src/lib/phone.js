export const PHONE_COUNTRY_CODES = [
  { label: "Australia", value: "+61" },
  { label: "New Zealand", value: "+64" },
];

export const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizePhoneToE164(localNumber, countryCode = "+61") {
  const code = String(countryCode || "+61").trim();
  let cleaned = String(localNumber || "").replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return {
      phone_e164: cleaned,
      phone_display: String(localNumber || "").trim(),
      is_valid: E164_PATTERN.test(cleaned),
    };
  }

  cleaned = cleaned.replace(/\D/g, "");
  if (code === "+61" && cleaned.startsWith("0")) cleaned = cleaned.slice(1);

  const phone_e164 = `${code}${cleaned}`;
  return {
    phone_e164,
    phone_display: String(localNumber || "").trim(),
    is_valid: E164_PATTERN.test(phone_e164),
  };
}