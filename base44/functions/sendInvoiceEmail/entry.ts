import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
const blockingStatuses = new Set(['paid', 'refunded', 'cancelled', 'void']);

function lineTotal(item) {
  const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
}

async function sendMail({ to, subject, body, from_name }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const recipients = String(to).split(",").map((e) => e.trim()).filter(Boolean);
  const from = `${from_name || "On The Run Electrics"} <hello@ontherunelectrics.com.au>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html: body }),
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

    const job = await base44.asServiceRole.entities.Job.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
    if (!job.customer_email) return Response.json({ error: 'No customer email on this job' }, { status: 400 });

    // Fetch invoice
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: jobId }, '-created_date', 1);
    const invoice = invoices[0];
    if (!invoice) return Response.json({ error: 'No invoice found for this job' }, { status: 404 });

    // Fetch quote for labour line
    const quotes = await base44.asServiceRole.entities.Quote.filter({ job_id: jobId }, '-created_date', 1);
    const quote = quotes[0] || null;

    // Fetch inventory usage (parts)
    const usageRecords = await base44.asServiceRole.entities.InventoryUsage.filter({ job_id: jobId });

    // Build line items — prefer copied invoice items, then quote items, then current job usage.
    const lineItems = (invoice.line_items?.length ? invoice.line_items : quote?.line_items?.length ? quote.line_items : []);
    if (lineItems.length === 0) {
      if (quote?.labour_estimate > 0) {
        lineItems.push({ description: 'Labour', qty: 1, unit_price: quote.labour_estimate, kind: 'labour' });
      }
      for (const u of usageRecords) {
        lineItems.push({
          description: u.item_name,
          qty: u.qty_used,
          unit_price: u.unit_sell || u.unit_cost || 0,
          kind: 'part',
        });
      }
    }

    const currency = invoice.currency || 'AUD';
    const total = Number(invoice.amount) || lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
    const customerName = job.customer_name || 'Customer';
    const reference = job.reference || invoice.number;
    const assetLabel = job.asset_label || job.scooter_label || 'your scooter';
    const paymentUrl = await createPaymentUrl({ base44, req, invoice, job });

    // Build line items rows HTML
    const lineItemsHtml = lineItems.length > 0
      ? lineItems.map((li) => {
          const lineAmount = lineTotal(li).toFixed(2);
          return `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 0;font-size:14px;color:#1e293b;">${li.description}</td>
            <td style="padding:10px 0;font-size:14px;color:#64748b;text-align:center;">${Number(li.qty) || 1}</td>
            <td style="padding:10px 0;font-size:14px;color:#64748b;text-align:right;">${currency} ${(Number(li.unit_price) || 0).toFixed(2)}</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${currency} ${lineAmount}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="4" style="padding:12px 0;font-size:13px;color:#94a3b8;text-align:center;">No line items recorded</td></tr>`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">On The Run Electrics</p>
                  <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Tax Invoice</h1>
                </td>
                <td align="right">
                  <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;">Invoice</p>
                  <p style="margin:2px 0 0;color:#ffffff;font-size:16px;font-weight:700;">${invoice.number}</p>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px;">${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bill To -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="vertical-align:top;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Bill To</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${customerName}</p>
                  ${job.customer_email ? `<p style="margin:2px 0 0;font-size:13px;color:#64748b;">${job.customer_email}</p>` : ''}
                  ${job.customer_phone ? `<p style="margin:2px 0 0;font-size:13px;color:#64748b;">${job.customer_phone}</p>` : ''}
                </td>
                <td width="50%" style="vertical-align:top;text-align:right;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Job Details</p>
                  <p style="margin:0;font-size:13px;color:#1e293b;font-weight:500;">${assetLabel}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#64748b;">Ref: ${reference}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Line Items -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="border-bottom:2px solid #e2e8f0;">
                  <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:left;font-weight:600;">Description</th>
                  <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:center;font-weight:600;">Qty</th>
                  <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:right;font-weight:600;">Unit Price</th>
                  <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:right;font-weight:600;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:16px 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td></td>
                <td align="right" style="padding-top:12px;border-top:2px solid #e2e8f0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 16px 4px 0;font-size:13px;color:#64748b;">Subtotal</td>
                      <td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:500;text-align:right;">${currency} ${total.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 16px 4px 0;font-size:16px;font-weight:700;color:#1e293b;">Total Due</td>
                      <td style="padding:8px 0 4px;font-size:20px;font-weight:800;color:#0f172a;text-align:right;">${currency} ${total.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0 0 16px;font-size:14px;color:#64748b;">Please arrange payment at your earliest convenience. For questions, reply to this email or contact us directly.</p>
            ${paymentUrl ? `<p style="margin:0 0 18px;"><a href="${paymentUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:10px;">Pay securely with Stripe</a></p>` : ''}
            <p style="margin:0;font-size:13px;color:#94a3b8;">📞 0415 505 908 &nbsp;·&nbsp; ✉️ hello@ontherunelectrics.com.au &nbsp;·&nbsp; 📍 11 Lucinda Street Woolloongabba QLD</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 36px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">On The Run Electrics · 11 Lucinda Street Woolloongabba QLD · This is a tax invoice for GST purposes</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendMail({
      to: job.customer_email,
      subject: `Invoice ${invoice.number} from On The Run Electrics — ${currency} ${total.toFixed(2)}`,
      body: htmlBody,
      from_name: 'On The Run Electrics',
    });

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Invoice.update(invoice.id, {
      invoiceVisibility: 'customer_visible',
      invoiceVisibleAt: invoice.invoiceVisibleAt || now,
      invoiceSentAt: invoice.invoiceSentAt || now,
      invoiceCustomerNotificationSentAt: now,
    });
    const nextJobStatus = ['ready_for_pickup', 'paid', 'completed'].includes(job.status) ? job.status : 'invoice_sent';
    await base44.asServiceRole.entities.Job.update(job.id, { status: invoice.status === 'paid' ? 'paid' : nextJobStatus, payment_status: invoice.status || 'outstanding' });

    console.log(`[sendInvoiceEmail] Sent invoice ${invoice.number} to ${job.customer_email}`);
    return Response.json({ sent: true, to: job.customer_email, invoice_number: invoice.number });

  } catch (error) {
    console.error('[sendInvoiceEmail] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});