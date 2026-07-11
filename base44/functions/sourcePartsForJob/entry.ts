import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { authorizeStaff } from '../_shared/authorization.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!authorizeStaff(user).allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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

    // 1. SEARCH MY OWN E-STORE FIRST.
    // Match active products against the job context (asset/service/issue keywords).
    const storeProducts = await base44.asServiceRole.entities.Product.filter({ active: true }, 'order', 500);
    const haystackTerms = `${asset} ${service} ${issue}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);

    const storeMatches = storeProducts
      .filter((p) => {
        const text = `${p.name || ''} ${p.description || ''} ${p.category_label || ''} ${p.sku || ''}`.toLowerCase();
        return haystackTerms.some((t) => text.includes(t));
      })
      .slice(0, 8)
      .map((p) => ({
        name: p.name || 'Part',
        typical_price: Number(p.price) || 0,
        retailer: 'My e-store',
        source: 'estore',
        in_stock: p.in_stock !== false,
        note: p.description || (p.category_label ? `${p.category_label}${p.sku ? ` · ${p.sku}` : ''}` : ''),
      }));

    // 2. SEARCH ONLINE in priority order: eScootNow, then Alibaba, eBay, Amazon.
    const prompt = `You are a parts-sourcing specialist for an electric scooter repair workshop.

Find the real, currently available replacement parts and consumables commonly needed for this job, specific to the exact make/model.

Scooter (make/model): ${asset}
Service type: ${service}
Reported issue: ${issue}

Search retailers in THIS STRICT PRIORITY ORDER and prefer earlier sources:
1. eScootNow (escootnow.com.au) — the workshop's primary supplier, always check first
2. Alibaba (alibaba.com)
3. eBay
4. Amazon

For each part, source it from the highest-priority retailer that has it in stock. Return the parts a technician would realistically need for this service on THIS specific scooter (e.g. for a brake job: brake pads, brake fluid, brake cable/lever if applicable, etc.).

For each part provide:
- name: clear part name including fitment if relevant
- typical_price: a realistic current AUD price (number only)
- retailer: which retailer it was sourced from — MUST be one of: eScootNow, Alibaba, eBay, Amazon
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

    // Order online retailers by the workshop's preferred priority.
    const retailerRank = { escootnow: 0, alibaba: 1, ebay: 2, amazon: 3 };
    const rankOf = (r) => {
      const key = (r || '').toLowerCase().replace(/[^a-z]/g, '');
      return retailerRank[key] ?? 99;
    };

    const onlineParts = (result?.parts || [])
      .map((p) => ({
        name: p.name || 'Part',
        typical_price: Number(p.typical_price) || 0,
        retailer: p.retailer || '',
        source: 'online',
        note: p.note || '',
      }))
      .sort((a, b) => rankOf(a.retailer) - rankOf(b.retailer));

    // My e-store always comes first, then online results in priority order.
    const parts = [...storeMatches, ...onlineParts];

    return Response.json({ parts, asset, service });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
