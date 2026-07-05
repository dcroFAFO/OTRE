import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — booking intake (job + attachment + audit) is
// created server-side in functions/createBooking.

export async function createBookingRequest(form) {
  const res = await base44.functions.invoke("createBooking", form);
  return res.data;
}

export async function sendBookingVerificationCode({ name, email, phone, channel }) {
  const res = await base44.functions.invoke("bookingVerification", { action: "send", name, email, phone, channel });
  return res.data;
}

export async function verifyBookingCode({ email, phone, code }) {
  const res = await base44.functions.invoke("bookingVerification", { action: "verify", email, phone, code });
  return res.data;
}