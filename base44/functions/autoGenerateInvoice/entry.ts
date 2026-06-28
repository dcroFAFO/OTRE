import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { data, old_data, event } = body;

    if (event?.type !== "update") {
      return Response.json({ skipped: "not an update event" });
    }

    if (data?.status !== "completed" || old_data?.status === "completed") {
      return Response.json({ skipped: "status not transitioning to completed" });
    }

    const jobId = event.entity_id;

    // Check if an invoice already exists for this job
    const existing = await base44.asServiceRole.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
    if (existing.length > 0) {
      console.log(`[autoGenerateInvoice] Invoice already exists for job ${jobId}, skipping.`);
      return Response.json({ skipped: "invoice already exists" });
    }

    // Fetch approved quote for labour/parts estimates
    const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: jobId }, "-created_date", 1);
    const quote = quotes[0] || null;

    // Fetch inventory usage for this job (parts used)
    const usageRecords = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: jobId });

    // Build line items from inventory usage
    const partsLineItems = usageRecords.map((u) => ({
      description: u.item_name,
      qty: u.qty_used,
      unit_price: u.unit_sell || u.unit_cost || 0,
      kind: "part",
    }));

    // Add labour line item from quote if available
    const labourLineItems = [];
    if (quote?.labour_estimate && quote.labour_estimate > 0) {
      labourLineItems.push({
        description: "Labour",
        qty: 1,
        unit_price: quote.labour_estimate,
        kind: "labour",
      });
    }

    const lineItems = [...labourLineItems, ...partsLineItems];

    // Calculate total
    const partsTotal = partsLineItems.reduce((sum, li) => sum + (li.qty * li.unit_price), 0);
    const labourTotal = labourLineItems.reduce((sum, li) => sum + li.unit_price, 0);
    const total = partsTotal + labourTotal;

    // Use quote total as fallback if no breakdown available
    const invoiceAmount = total > 0 ? total : (quote?.total || 0);

    const currency = quote?.currency || "AUD";
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // Create the invoice as a draft (outstanding status per settings)
    const invoice = await base44.asServiceRole.entities.Invoice.create({
      job_id: jobId,
      customer_id: data.customer_id || data.customer_account_id || '',
      number: invoiceNumber,
      amount: invoiceAmount,
      currency,
      status: "outstanding",
      invoiceVisibility: "internal",
      line_items: lineItems,
      internalCostingNotes: quote?.diagnosis_notes || "",
    });

    // Link the invoice back to the job and mark payment as outstanding
    await base44.asServiceRole.entities.Job.update(jobId, {
      invoice_id: invoice.id,
      payment_status: "outstanding",
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      job_id: jobId,
      event_type: "invoice_created",
      summary: `Invoice ${invoiceNumber} auto-generated on job completion (${currency} ${invoiceAmount.toFixed(2)})`,
      visibility: "internal",
      actor_name: "System",
    });

    console.log(`[autoGenerateInvoice] Created invoice ${invoiceNumber} for job ${jobId} — ${currency} ${invoiceAmount.toFixed(2)}`);

    return Response.json({
      created: true,
      invoice_number: invoiceNumber,
      amount: invoiceAmount,
      currency,
      parts_line_items: partsLineItems.length,
      labour_line_items: labourLineItems.length,
    });

  } catch (error) {
    console.error("[autoGenerateInvoice] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});