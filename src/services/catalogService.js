import { base44 } from "@/api/base44Client";

export async function listPublicCatalog({ page = 1, pageSize = 48, category = "", search = "" } = {}) {
  const response = await base44.functions.invoke("publicCatalog", {
    page,
    page_size: pageSize,
    category,
    search,
  });
  const detail = response?.data?.error;
  if (response?.data?.ok !== true || !response.data.data) {
    const message = typeof detail === "object" ? detail?.message : detail;
    throw Object.assign(new Error(message || "The product catalogue could not be loaded."), {
      code: typeof detail === "object" ? detail?.code : undefined,
      status: response?.status || 400,
      response,
    });
  }
  return response.data.data;
}
