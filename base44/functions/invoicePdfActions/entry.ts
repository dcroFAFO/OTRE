import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.2.1';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
const blockingStatuses = new Set(['paid', 'refunded', 'cancelled', 'void']);

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

async function sendMail({ to, subject, html, fromName, fileName, pdfBase64 }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const recipients = String(to).split(",").map((e) => e.trim()).filter(Boolean);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName || DEFAULT_BUSINESS.name} <hello@ontherunelectrics.com.au>`,
      to: recipients,
      subject,
      html,
      attachments: [{ filename: fileName, content: pdfBase64 }],
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}

async function createPaymentUrl({ base44, req, invoice, job }) {
  if (blockingStatuses.has(invoice.status)) return null;
  const amount = Math.round((Number(invoice.amount) || 0) * 100);
  if (amount <= 0) return null;

  const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://app.base44.com';
  const metadata = {
    base44_app_id: Deno.env.get('BASE44_APP_ID') || '',
    invoice_id: invoice.id,
    job_id: invoice.job_id || '',
    customer_id: invoice.customer_id || '',
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: job.customer_email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: String(invoice.currency || 'AUD').toLowerCase(),
        unit_amount: amount,
        product_data: {
          name: invoice.number ? `Invoice ${invoice.number}` : 'Invoice payment',
          description: job.reference ? `Job ${job.reference}` : 'Invoice payment',
        },
      },
    }],
    success_url: `${origin}/portal?payment=success&invoice=${encodeURIComponent(invoice.id)}`,
    cancel_url: `${origin}/portal?payment=cancelled&invoice=${encodeURIComponent(invoice.id)}`,
    metadata,
    payment_intent_data: { metadata },
  });

  await base44.asServiceRole.entities.Invoice.update(invoice.id, {
    payment_provider: 'stripe',
    payment_intent_ref: session.id,
  });
  return session.url;
}

function buildLineItems(invoice, quote, usageRecords) {
  const usages = usageRecords || [];
  const usageCodeByName = new Map(usages.map((usage) => [clean(usage.item_name).toLowerCase(), clean(usage.product_sku || usage.item_id)]));
  const items = invoice?.line_items?.length ? [...invoice.line_items] : quote?.line_items?.length ? [...quote.line_items] : [];
  if (items.length === 0) {
    if (Number(quote?.labour_estimate) > 0) {
      items.push({ description: "Labour", qty: 1, unit_price: Number(quote.labour_estimate), kind: "labour" });
    }
    for (const usage of usages) {
      items.push({
        description: usage.item_name || "Part",
        qty: Number(usage.qty_used) || 1,
        unit_price: Number(usage.unit_sell || usage.unit_cost || 0),
        kind: "part",
        sku: usage.product_sku || usage.item_id || "",
      });
    }
  }
  return items.map((item) => {
    const description = clean(item.description, "Line item");
    const matchedCode = usageCodeByName.get(description.toLowerCase()) || "";
    return {
      description,
      sku: clean(item.sku || item.product_sku || item.product_code || item.code || matchedCode),
      qty: Number(item.qty) || 1,
      unit_price: Number(item.unit_price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      kind: clean(item.kind, "item"),
    };
  });
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
  doc.text("SKU / code", pageWidth - 255, y, { align: "right" });
  doc.text("Qty", pageWidth - 185, y, { align: "right" });
  doc.text("Unit", pageWidth - 110, y, { align: "right" });
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
    const descriptionLines = doc.splitTextToSize(item.description, 205);
    doc.text(descriptionLines, margin, y);
    doc.text(item.sku || "-", pageWidth - 255, y, { align: "right" });
    doc.text(String(item.qty), pageWidth - 185, y, { align: "right" });
    doc.text(money(currency, item.unit_price), pageWidth - 110, y, { align: "right" });
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
    invoice = invoiceId
      ? await base44.asServiceRole.entities.Invoice.get(invoiceId)
      : (await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id }, "-created_date", 1))[0];
  } catch {
    invoice = null;
  }
  if (!invoice) return { error: "No invoice found for this job", status: 404 };

  const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job.id }, "-created_date", 1);
  const usageRecords = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: job.id });
  return { job, invoice, quote: quotes[0] || null, usageRecords };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isStaff = ["admin", "employee", "technician", "staff"].includes(user.role) || user.is_customer === false || user.data?.is_customer === false;
    if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { action, jobId, invoiceId, notes = "", regenerateCount = 0 } = await req.json();
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    const business = await getBusiness(base44);
    const context = await loadInvoiceContext(base44, jobId, invoiceId);
    if (context.error) return Response.json({ error: context.error }, { status: context.status });
    const { job, invoice, quote, usageRecords } = context;
    const lineItems = buildLineItems(invoice, quote, usageRecords);
    const pdfBase64 = generatePdf({ business, job, invoice, lineItems, notes, regenerateCount });
    const fileName = `${invoice.number || "tax-invoice"}-${job.reference || job.id}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");

    if (action === "generate" || action === "regenerate") {
      return Response.json({ pdfBase64, fileName, invoiceNumber: invoice.number, customerEmail: job.customer_email || "" });
    }

    if (action === "email") {
      if (!job.customer_email) return Response.json({ error: "No customer email on this job" }, { status: 400 });
      const total = Number(invoice.amount) || lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
      const paymentUrl = await createPaymentUrl({ base44, req, invoice, job });
      await sendMail({
        to: job.customer_email,
        subject: `Tax invoice ${invoice.number} from ${business.name}`,
        fromName: business.name,
        fileName,
        pdfBase64,
        html: `<p>Hi ${job.customer_name || "there"},</p><p>Please find your tax invoice attached for job ${job.reference || job.id}.</p><p><strong>Total due:</strong> ${money(invoice.currency || "AUD", total)}</p>${paymentUrl ? `<p><a href="${paymentUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">Pay securely with Stripe</a></p>` : ""}<p>Regards,<br>${business.name}</p>`,
      });
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        invoiceVisibility: "customer_visible",
        invoiceVisibleAt: invoice.invoiceVisibleAt || now,
        invoiceSentAt: invoice.invoiceSentAt || now,
        invoiceCustomerNotificationSentAt: now,
      });
      await base44.asServiceRole.entities.AuditEvent.create({
        event_type: "invoice_pdf_emailed",
        job_id: job.job_id || job.id,
        customer_id: job.customer_id || "",
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: user.role || "system",
        summary: `Tax invoice PDF emailed to ${job.customer_email}`,
        visibility: "customer",
      });
      return Response.json({ sent: true, to: job.customer_email, fileName });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[invoicePdfActions] Error:", error.message, error.stack);
    return Response.json({ error: error.message || "Failed to generate invoice PDF" }, { status: 500 });
  }
});