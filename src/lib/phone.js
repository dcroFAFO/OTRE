export const AU_MOBILE_E164_PATTERN = /^\+614\d{8}$/;
export const E164_PATTERN = AU_MOBILE_E164_PATTERN;

export function normalizePhoneToE164(localNumber) {
  const phone_display = String(localNumber || "").trim();
  let cleaned = phone_display.replace(/\D/g, "");

  if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);

  const phone_e164 = `+61${cleaned}`;
  return {
    phone_e164,
    phone_display,
    is_valid: AU_MOBILE_E164_PATTERN.test(phone_e164),
  };
}