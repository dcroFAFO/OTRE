import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CALENDAR_SUMMARY = 'Repair Schedule';
const CALENDAR_TIMEZONE = 'Australia/Brisbane';

function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

function googleHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function googleRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Google Calendar request failed with status ${response.status}`);
  }
  return data;
}

async function getOrCreateRepairsCalendar(accessToken) {
  const headers = googleHeaders(accessToken);
  const list = await googleRequest('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', { headers });
  const existing = (list.items || []).find((calendar) => calendar.summary === CALENDAR_SUMMARY);
  if (existing?.id) return existing.id;

  const created = await googleRequest('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers,
    body: JSON.stringify({ summary: CALENDAR_SUMMARY, timeZone: CALENDAR_TIMEZONE }),
  });
  return created.id;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildEvent(job) {
  const reference = job.reference ? ` (${job.reference})` : '';
  const customer = job.customer_name || 'Customer';
  const asset = job.asset_label || job.scooter_details || job.scooterDetails || 'Scooter';
  const issue = job.issue_description || job.issueDescription || '';
  const description = [
    `Customer: ${customer}`,
    job.reference ? `Job reference: ${job.reference}` : null,
    `Scooter: ${asset}`,
    job.customer_phone ? `Phone: ${job.customer_phone}` : null,
    job.customer_email ? `Email: ${job.customer_email}` : null,
    job.preferred_time_window ? `Preferred time: ${job.preferred_time_window}` : null,
    issue ? `Issue: ${issue}` : null,
  ].filter(Boolean).join('\n');

  return {
    summary: `Repair: ${customer}${reference}`,
    description,
    start: { date: job.scheduled_date },
    end: { date: addDays(job.scheduled_date, 1) },
    extendedProperties: { private: { base44_job_id: job.id } },
  };
}

async function findMapping(base44, jobId) {
  const rows = await base44.asServiceRole.entities.JobCalendarEvent.filter({ job_id: jobId }, '-created_date', 1);
  return rows[0] || null;
}

async function getJobFromPayload(base44, body) {
  if (body?.data?.id) return body.data;
  if (body?.event?.entity_id) return await base44.asServiceRole.entities.Job.get(body.event.entity_id);
  if (body?.jobId) return await base44.asServiceRole.entities.Job.get(body.jobId);
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const job = await getJobFromPayload(base44, body);

    if (!job?.id) return jsonResponse({ skipped: 'No job found' });
    if (!job.scheduled_date) return jsonResponse({ skipped: 'Job has no scheduled date', job_id: job.id });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const calendarId = await getOrCreateRepairsCalendar(accessToken);
    const headers = googleHeaders(accessToken);
    const eventBody = buildEvent(job);
    const mapping = await findMapping(base44, job.id);
    const now = new Date().toISOString();

    if (mapping?.event_id) {
      const updated = await googleRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id || calendarId)}/events/${encodeURIComponent(mapping.event_id)}`,
        { method: 'PATCH', headers, body: JSON.stringify(eventBody) }
      );
      await base44.asServiceRole.entities.JobCalendarEvent.update(mapping.id, {
        calendar_id: mapping.calendar_id || calendarId,
        event_id: updated.id,
        event_link: updated.htmlLink,
        last_synced_at: now,
      });
      return jsonResponse({ synced: true, action: 'updated', job_id: job.id, event_id: updated.id });
    }

    const created = await googleRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', headers, body: JSON.stringify(eventBody) }
    );
    await base44.asServiceRole.entities.JobCalendarEvent.create({
      job_id: job.id,
      calendar_id: calendarId,
      event_id: created.id,
      event_link: created.htmlLink,
      last_synced_at: now,
    });
    return jsonResponse({ synced: true, action: 'created', job_id: job.id, event_id: created.id });
  } catch (error) {
    console.error('[syncJobToGoogleCalendar] failed:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});