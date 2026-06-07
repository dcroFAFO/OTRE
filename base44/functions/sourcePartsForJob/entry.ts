import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await base44.entities.Job.get(jobId);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const asset = job.asset_label || job.scooter_label || 'unknown electric scooter';
    const service = job.service_category_key || job.job_type || 'general repair';
    const issue = job.issue_description || '';

    const prompt = `You are a parts-sourcing specialist for an electric scooter repair workshop.

Find the real, currently available replacement parts and consumables commonly needed for this job, specific to the exact make/model.

Scooter (make/model): ${asset}
Service type: ${service}
Reported issue: ${issue}

Search retailers such as eBay, Amazon, iScoot, Scooter Hut, and other reputable electric scooter parts suppliers. Return the parts a technician would realistically need for this service on THIS specific scooter (e.g. for a brake job: brake pads, brake fluid, brake cable/lever if applicable, etc.).

For each part provide:
- name: clear part name including fitment if relevant
- typical_price: a realistic current AUD price (number only)
- retailer: where it is commonly available (e.g. eBay, Amazon, iScoot, Scooter Hut)
- note: short fitment/compatibility note for this make/model

Only include parts genuinely relevant to this scooter and service. Return between 2 and 8 parts. Prices must be realistic current market prices in AUD.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          parts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                typical_price: { type: 'number' },
                retailer: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['name', 'typical_price'],
            },
          },
        },
        required: ['parts'],
      },
    });

    const parts = (result?.parts || []).map((p) => ({
      name: p.name || 'Part',
      typical_price: Number(p.typical_price) || 0,
      retailer: p.retailer || '',
      note: p.note || '',
    }));

    return Response.json({ parts, asset, service });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});