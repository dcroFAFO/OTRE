import { base44 } from "@/api/base44Client";

function portalError(response, fallbackMessage) {
  const detail = response?.data?.error;
  const message = typeof detail === "object" ? detail?.message : detail;
  return Object.assign(new Error(message || fallbackMessage), {
    code: typeof detail === "object" ? detail?.code : undefined,
    status: response?.status || 400,
    response,
  });
}

async function invokePortalData(payload, fallbackMessage) {
  const response = await base44.functions.invoke("customerPortalData", payload);
  if (response?.data?.ok !== true || !response.data.data) {
    throw portalError(response, fallbackMessage);
  }
  return response.data.data;
}

export function getCustomerPortalOverview() {
  return invokePortalData(
    { action: "overview" },
    "Your account information could not be loaded.",
  );
}

export function getCustomerPortalJob(jobId) {
  if (!jobId) return Promise.reject(new Error("A repair reference is required."));
  return invokePortalData(
    { action: "job", job_id: jobId },
    "The repair details could not be loaded.",
  );
}
