import { base44 } from "@/api/base44Client";

export const aiService = {
  async suggestRepairEstimate(/* job */) {
    return { available: false, suggestion: null, message: "AI estimate not yet configured." };
  },
  async draftQuote(job) {
    const res = await base44.functions.invoke("quoteActions", { action: "ai_draft", jobId: job.id });
    return { available: true, draft: res.data };
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