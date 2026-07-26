import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SPREADSHEET_ID = '1xd886sLvzixTxElBE4piuv39QoX07HfnnMuXY2IZSlc';
const SHEET_NAME = 'Customers';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { customer_id } = await req.json().catch(() => ({}));
    if (!customer_id) return Response.json({ error: 'customer_id is required' }, { status: 400 });

    const customer = await base44.asServiceRole.entities.Customer.get(customer_id).catch(() => null);
    if (!customer) return Response.json({ skipped: 'customer not found' });

    const email = String(customer.email || '').trim().toLowerCase();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Skip if this customer (by email, else by id) is already listed.
    const existingRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!C2:G?majorDimension=COLUMNS`,
      { headers: authHeader },
    );
    const existing = await existingRes.json();
    if (!existingRes.ok) {
      console.error('[syncCustomerToSheet] read failed:', JSON.stringify(existing));
      return Response.json({ error: 'Could not read the customer sheet' }, { status: 500 });
    }
    const emails = (existing.values?.[0] || []).map((v) => String(v || '').trim().toLowerCase());
    const ids = existing.values?.[4] || [];
    if ((email && emails.includes(email)) || ids.includes(customer.id)) {
      return Response.json({ skipped: 'already in sheet', customer_id: customer.id });
    }

    const row = [
      new Date().toISOString().slice(0, 10),
      customer.full_name || customer.name || '',
      customer.email || '',
      customer.phone_display || customer.phone_e164 || customer.phone || '',
      customer.user_id ? 'Account signup' : 'Booking',
      customer.status || 'active',
      customer.id,
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:G1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) },
    );
    const appendData = await appendRes.json();
    if (!appendRes.ok) {
      console.error('[syncCustomerToSheet] append failed:', JSON.stringify(appendData));
      return Response.json({ error: 'Could not append to the customer sheet' }, { status: 500 });
    }

    return Response.json({ appended: true, customer_id: customer.id });
  } catch (error) {
    console.error('[syncCustomerToSheet] failed:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});