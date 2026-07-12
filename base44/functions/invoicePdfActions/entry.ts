import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.2.1';

const DEFAULT_BUSINESS = {
  name: "On The Run Electrics",
  legalName: "On The Run Electrics",
  email: "hello@otrscooters.com",
  phone: "(03) 9000 1234",
  address: "12 Workshop Lane, Melbourne VIC",
  abn: "00 000 000 000",
};

const money = (currency, value) => `${currency} ${(Number(value) || 0).toFixed(2)}`;
const clean = (value, fallback = "") => String(value || fallback || "").trim();
const lineTotal = (item) => {
  const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
};

async function getBusiness(base44) {
  try {
    const profiles = await base44.asServiceRole.entities.BusinessProfile.list("-updated_date", 1);
    const profile = profiles?.[0] || {};
    return {
      ...DEFAULT_BUSINESS,
      ...profile,
      name: profile.business_name || profile.name || DEFAULT_BUSINESS.name,
      legalName: profile.legal_name || profile.legalName || profile.business_name || DEFAULT_BUSINESS.legalName,
      email: profile.email || profile.contact_email || DEFAULT_BUSINESS.email,
      phone: profile.phone || profile.contact_phone || DEFAULT_BUSINESS.phone,
      address: profile.address || profile.business_address || DEFAULT_BUSINESS.address,
      abn: profile.abn || profile.tax_number || DEFAULT_BUSINESS.abn,
    };
  } catch {
    return DEFAULT_BUSINESS;
  }
}

function normaliseCategory(value) {
  const key = clean(value, "fee").toLowerCase();
  if (["part", "labour", "consumable", "fee"].includes(key)) return key;
  if (["surcharge", "expense", "discount", "item"].includes(key)) return "fee";
  return "fee";
}

function normalizeLineItems(items, usageRecords = []) {
  const usageCodeByName = new Map((usageRecords || []).map((usage) => [clean(usage.item_name).toLowerCase(), clean(usage.product_sku || usage.item_id)]));
  return (Array.isArray(items) ? items : []).map((item) => {
    const description = clean(item.description, "Line item");
    const matchedCode = usageCodeByName.get(description.toLowerCase()) || "";
    const qty = Number(item.qty ?? item.quantity) || 1;
    const unitPrice = Number(item.unit_price ?? item.customer_unit_price ?? item.unitPrice) || 0;
    const taxRate = Number(item.tax_rate ?? item.taxRate ?? item.tax ?? 0) || 0;
    const discountAmount = Number(item.discount_amount ?? item.discountAmount ?? 0) || 0;
    const category = normaliseCategory(item.category || item.kind);
    const normalised = {
      description,
      sku: clean(item.sku || item.product_sku || item.product_code || item.code || matchedCode),
      qty,
      quantity: qty,
      unit_price: unitPrice,
      unitPrice,
      internal_cost_price: Number(item.internal_cost_price ?? item.cost_price) || 0,
      markup_percentage: Number(item.markup_percentage) || (category === "part" ? 20 : 0),
      customer_unit_price: Number(item.customer_unit_price ?? unitPrice) || 0,
      customer_line_total: Math.round(unitPrice * qty * 100) / 100,
      is_custom_misc_part: !!item.is_custom_misc_part,
      staff_notes: clean(item.staff_notes || item.note),
      tax_rate: taxRate,
      tax: taxRate,
      discount_amount: discountAmount,
      kind: category,
      category,
      source_usage_id: clean(item.source_usage_id),
    };
    normalised.lineTotal = lineTotal(normalised);
    return normalised;
  });
}

function buildLineItems({ invoiceDraft, quote, usageRecords }) {
  const draftItems = invoiceDraft?.lineItems || invoiceDraft?.line_items;
  if (Array.isArray(draftItems) && draftItems.length > 0) return normalizeLineItems(draftItems, usageRecords);

  const partItems = (usageRecords || [])
    .filter((usage) => !String(usage.item_id || "").startsWith("labour-"))
    .map((usage) => {
      const qty = Number(usage.qty_used) || 1;
      const unitPrice = Number(usage.unit_sell) || Math.round((Number(usage.unit_cost) || 0) * 1.2 * 100) / 100;
      return {
        description: usage.item_name || "Part",
        qty,
        unit_price: unitPrice,
        internal_cost_price: Number(usage.unit_cost) || 0,
        markup_percentage: Number(usage.markup_percentage) || 20,
        customer_unit_price: unitPrice,
        customer_line_total: Math.round(unitPrice * qty * 100) / 100,
        is_custom_misc_part: !!usage.is_custom_misc_part,
        staff_notes: usage.note || "",
        category: "part",
        sku: usage.product_sku || usage.item_id || "",
        source_usage_id: usage.id,
      };
    });

  const labourAndConsumables = (quote?.line_items || [])
    .filter((item) => normaliseCategory(item.category || item.kind) !== "part")
    .map((item) => ({ ...item, category: normaliseCategory(item.category || item.kind) }));

  return normalizeLineItems([...partItems, ...labourAndConsumables], usageRecords);
}

function generatePdf({ business, job, invoice, lineItems, notes, regenerateCount = 0 }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const currency = invoice.currency || "AUD";
  const intake = job.intake || {};
  const subtotal = lineItems.reduce((sum, item) => sum + ((Number(item.qty) || 1) * (Number(item.unit_price) || 0)), 0);
  const discountTotal = lineItems.reduce((sum, item) => sum + (Number(item.discount_amount) || 0), 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
    return sum + base * ((Number(item.tax_rate) || 0) / 100);
  }, 0);
  const total = Number(invoice.amount) || lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const issueDate = new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 112, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("TAX INVOICE", margin, 54);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(business.legalName || business.name, margin, 78);
  doc.text(`ABN ${business.abn || DEFAULT_BUSINESS.abn}`, margin, 94);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(invoice.number || invoice.invoice_id || "Invoice", pageWidth - margin, 54, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Issued ${issueDate}`, pageWidth - margin, 74, { align: "right" });
  doc.text(`Job ${job.reference || job.job_id || job.id}`, pageWidth - margin, 92, { align: "right" });

  doc.setTextColor(15, 23, 42);
  let y = 150;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FROM", margin, y);
  doc.text("BILL TO", pageWidth / 2, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text([business.name, business.address, business.phone, business.email].filter(Boolean), margin, y, { lineHeightFactor: 1.35 });
  doc.text([job.customer_name || "Customer", `Customer ID: ${job.customer_id || "-"}`, job.customer_email || "", job.customer_phone || ""].filter(Boolean), pageWidth / 2, y, { lineHeightFactor: 1.35 });

  y = 238;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y - 18, pageWidth - margin * 2, 74, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Scooter / job details", margin + 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference: ${job.reference || job.job_id || job.id}`, margin + 14, y + 18);
  doc.text(`Make / model: ${[intake.make, intake.model].filter(Boolean).join(" ") || job.asset_label || "-"}`, margin + 14, y + 36);
  doc.text(`Serial / frame: ${intake.serial_number || "-"}`, pageWidth / 2, y + 18);
  doc.text(`Customer email: ${job.customer_email || "-"}`, pageWidth / 2, y + 36);

  y = 340;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", margin, y);
  doc.text("Category", pageWidth - 318, y, { align: "right" });
  doc.text("GST", pageWidth - 255, y, { align: "right" });
  doc.text("Qty", pageWidth - 195, y, { align: "right" });
  doc.text("Unit", pageWidth - 115, y, { align: "right" });
  doc.text("Total", pageWidth - margin, y, { align: "right" });
  y += 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  for (const item of lineItems) {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    const descriptionLines = doc.splitTextToSize(item.sku ? `${item.description} (${item.sku})` : item.description, 205);
    doc.text(descriptionLines, margin, y);
    doc.text(item.category || item.kind || "fee", pageWidth - 318, y, { align: "right" });
    doc.text(`${Number(item.tax_rate) || 0}%`, pageWidth - 255, y, { align: "right" });
    doc.text(String(item.qty), pageWidth - 195, y, { align: "right" });
    doc.text(money(currency, item.unit_price), pageWidth - 115, y, { align: "right" });
    doc.text(money(currency, lineTotal(item)), pageWidth - margin, y, { align: "right" });
    y += Math.max(22, descriptionLines.length * 13 + 8);
  }

  y += 12;
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", pageWidth - 170, y, { align: "right" });
  doc.text(money(currency, subtotal), pageWidth - margin, y, { align: "right" });
  y += 18;
  doc.text("GST", pageWidth - 170, y, { align: "right" });
  doc.text(money(currency, taxAmount), pageWidth - margin, y, { align: "right" });
  y += 18;
  if (discountTotal > 0) {
    doc.text("Discounts", pageWidth - 170, y, { align: "right" });
    doc.text(`-${money(currency, discountTotal)}`, pageWidth - margin, y, { align: "right" });
    y += 18;
  }
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Total due", pageWidth - 170, y, { align: "right" });
  doc.text(money(currency, total), pageWidth - margin, y, { align: "right" });

  if (notes) {
    y += 44;
    doc.setFontSize(10);
    doc.text("Notes", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(notes, pageWidth - margin * 2), margin, y + 18);
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated by invoice assistant${regenerateCount ? ` · revision ${regenerateCount + 1}` : ""}`, margin, 805);
  doc.text("Please keep this invoice for your records.", pageWidth - margin, 805, { align: "right" });

  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1];
}

async function loadInvoiceContext(base44, jobId, invoiceId) {
  let job = null;
  try {
    job = await base44.asServiceRole.entities.Job.get(jobId);
  } catch {
    job = null;
  }
  if (!job) return { error: "Job not found", status: 404 };

  let invoice = null;
  try {
    if (invoiceId) invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    else if (job.invoice_id) invoice = await base44.asServiceRole.entities.Invoice.get(job.invoice_id);
  } catch {
    invoice = null;
  }
  if (!invoice) {
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, "-created_date", 1);
    invoice = invoices[0] || null;
  }

  const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job.id }, "-created_date", 1);
  const primaryUsage = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.id });
  const legacyUsage = job.job_id && job.job_id !== job.id
    ? await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.job_id })
    : [];
  const seen = new Set();
  const usageRecords = [...primaryUsage, ...legacyUsage].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return { job, invoice, quote: quotes[0] || null, usageRecords };
}

function validateInvoiceData(job, lineItems) {
  if (!clean(job.customer_name)) return "Invoice could not be generated. Missing customer name.";
  if (!clean(job.customer_email)) return "Missing customer email.";
  if (!clean(job.reference || job.job_id || job.id)) return "Invoice could not be generated. Missing job/reference number.";
  if (!lineItems.length) return "No billing line items found.";
  const invalidItem = lineItems.find((item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    return !clean(item.description) || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0;
  });
  if (invalidItem) return "Invoice could not be generated. Check line item quantities and prices.";
  return "";
}

function invoicePayload(job, invoice, invoiceDraft, lineItems) {
  const currency = invoice?.currency || invoiceDraft?.currency || "AUD";
  const amount = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  return {
    invoice_id: invoice?.invoice_id || invoiceDraft?.invoice_id || "",
    quote_id: invoice?.quote_id || "",
    job_id: job.id,
    customer_id: job.customer_id || "",
    number: invoice?.number || invoiceDraft?.number || `INV-${Date.now().toString().slice(-6)}`,
    amount,
    currency,
    status: invoice?.status || "outstanding",
    invoiceVisibility: invoice?.invoiceVisibility || "internal",
    internalCostingNotes: invoiceDraft?.internalCostingNotes || invoice?.internalCostingNotes || "",
    line_items: lineItems.map((item) => ({
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      customer_unit_price: item.customer_unit_price || item.unit_price,
      customer_line_total: item.customer_line_total || lineTotal(item),
      is_custom_misc_part: !!item.is_custom_misc_part,
      tax_rate: item.tax_rate,
      discount_amount: item.discount_amount,
      kind: item.category,
      category: item.category,
      sku: item.sku || "",
      source_usage_id: item.source_usage_id || "",
    })),
  };
}

async function persistInvoice(base44, job, invoice, invoiceDraft, lineItems) {
  const payload = invoicePayload(job, invoice, invoiceDraft, lineItems);
  const saved = invoice
    ? await base44.asServiceRole.entities.Invoice.update(invoice.id, payload)
    : await base44.asServiceRole.entities.Invoice.create(payload);

  await base44.asServiceRole.entities.Job.update(job.id, {
    invoice_id: saved.id,
    payment_status: saved.status || "outstanding",
  });

  return saved;
}

Deno.serve(async (req) => {
  const requestMeta = { fn: "invoicePdfActions" };
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isStaff = ["admin", "employee", "technician", "staff"].includes(user.role) || user.is_customer === false || user.data?.is_customer === false;
    if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { action, jobId, invoiceId, invoiceDraft = null, notes = "", regenerateCount = 0 } = await req.json();
    requestMeta.action = action;
    requestMeta.jobId = jobId;
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    const business = await getBusiness(base44);
    const context = await loadInvoiceContext(base44, jobId, invoiceId || invoiceDraft?.invoiceId);
    if (context.error) return Response.json({ error: context.error }, { status: context.status });
    const { job, invoice, quote, usageRecords } = context;
    const lineItems = buildLineItems({ invoiceDraft, quote, usageRecords });
    const validationError = validateInvoiceData(job, lineItems);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });

    const previewInvoice = invoicePayload(job, invoice, invoiceDraft, lineItems);
    let pdfBase64;
    try {
      pdfBase64 = generatePdf({ business, job, invoice: previewInvoice, lineItems, notes, regenerateCount });
    } catch (pdfError) {
      console.error("[invoicePdfActions] PDF generation failed", JSON.stringify({ ...requestMeta, message: pdfError.message, stack: pdfError.stack }));
      return Response.json({ error: "PDF generation failed." }, { status: 500 });
    }

    const fileName = `${previewInvoice.number || "tax-invoice"}-${job.reference || job.id}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");

    if (["preview", "generate", "regenerate"].includes(action)) {
      return Response.json({ pdfBase64, fileName, invoiceNumber: previewInvoice.number, customerEmail: job.customer_email || "", lineItems });
    }

    if (action === "email") {
      let savedInvoice;
      try {
        savedInvoice = await persistInvoice(base44, job, invoice, invoiceDraft, lineItems);
      } catch (persistError) {
        console.error("[invoicePdfActions] invoice persistence failed", JSON.stringify({ ...requestMeta, message: persistError.message, stack: persistError.stack }));
        return Response.json({ error: "Invoice could not be generated." }, { status: 500 });
      }

      // No email is sent — the invoice is finalised and made visible in the customer portal only.
      const now = new Date().toISOString();
      const visibleInvoice = await base44.asServiceRole.entities.Invoice.update(savedInvoice.id, {
        invoiceVisibility: "customer_visible",
        invoiceVisibleAt: savedInvoice.invoiceVisibleAt || now,
        invoiceSentAt: savedInvoice.invoiceSentAt || now,
        invoiceCustomerNotificationSentAt: now,
      });
      await base44.asServiceRole.entities.Job.update(job.id, {
        invoice_id: savedInvoice.id,
        payment_status: savedInvoice.status || "outstanding",
        status: ["ready_for_pickup", "paid", "completed"].includes(job.status) ? job.status : "invoice_sent",
      });
      await base44.asServiceRole.entities.AuditEvent.create({
        event_type: "invoice_finalised",
        job_id: job.job_id || job.id,
        customer_id: job.customer_id || "",
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: user.role || "system",
        summary: "Tax invoice finalised and made visible to the customer",
        visibility: "customer",
      });
      if (!savedInvoice.invoiceSentAt || savedInvoice.invoiceVisibility !== "customer_visible") {
        await base44.asServiceRole.entities.NotificationEvent.create({
          event_key: "invoice.issued", related_entity_type: "Invoice", related_entity_id: visibleInvoice.id, job_id: job.id,
          customer_id: job.customer_id || "", recipient_user_id: job.customer_user_id || "",
          event_version: visibleInvoice.invoiceSentAt || visibleInvoice.updated_date || String(Date.now()),
          event_data: { customer_name: job.customer_name, customer_email: job.customer_email, customer_phone: job.customer_phone_e164, message: `Invoice ${visibleInvoice.number || ""} is now available in your portal.` },
          source: "automatic", status: "pending", occurred_at: now,
        });
      }
      return Response.json({ sent: true, fileName, invoice: visibleInvoice });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[invoicePdfActions] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    return Response.json({ error: "Invoice could not be generated." }, { status: 500 });
  }
});