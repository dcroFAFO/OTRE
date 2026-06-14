// AI assistant STUBS. No real AI calls yet — clean hooks an AI agent can be
// connected to later without rewriting the job system. Each returns a
// structured placeholder so UI can be wired up now.

export const aiService = {
  async suggestRepairEstimate(/* job */) {
    return { available: false, suggestion: null, message: "AI estimate not yet configured." };
  },
  async draftQuote(job) {
    const { base44 } = await import("@/api/base44Client");
    const res = await base44.functions.invoke("draftQuoteForJob", { jobId: job.id });
    return { available: true, draft: res.data?.draft || null };
  },
  async sourceParts(/* job */) {
    return { available: false, parts: [], message: "AI parts sourcing not yet configured." };
  },
  async summariseDiagnosis(/* job */) {
    return { available: false, summary: null, message: "AI diagnosis summary not yet configured." };
  },
  async draftCustomerMessage(/* job */) {
    return { available: false, message: null, note: "AI message drafting not yet configured." };
  },
};