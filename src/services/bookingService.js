import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — booking intake (job + attachment + audit) is
// created server-side in functions/createBooking.

export async function createBookingRequest(form) {
  const res = await base44.functions.invoke("createBooking", form);
  return res.data;
}