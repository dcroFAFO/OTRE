// AI assistant STUBS. No real AI calls yet — clean hooks an AI agent can be
// connected to later without rewriting the job system. Each returns a
// structured placeholder so UI can be wired up now.

export const aiService = {
  async suggestRepairEstimate(/* job */) {
    return { available: false, suggestion: null, message: "AI estimate not yet configured." };
  },
  async draftQuote(/* job */) {
    return { available: false, draft: null, message: "AI quote drafting not yet configured." };
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