import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CALENDAR_SUMMARY = 'Repair Schedule';
const CALENDAR_TIMEZONE = 'Australia/Brisbane';
const SYNC_KEY = 'google_calendar_jobs';

function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

function googleHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
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

async function getSyncState(base44, calendarId) {
  const rows = await base44.asServiceRole.entities.SyncState.filter({ key: SYNC_KEY }, '-created_date', 1);
  const existing = rows[0] || null;
  if (existing) return existing;
  return await base44.asServiceRole.entities.SyncState.create({ key: SYNC_KEY, calendar_id: calendarId, last_synced_at: new Date().toISOString() });
}

function eventDate(event) {
  return event?.start?.date || (event?.start?.dateTime ? event.start.dateTime.slice(0, 10) : null);
}

async function findMappingForEvent(base44, event) {
  const jobId = event?.extendedProperties?.private?.base44_job_id;
  if (jobId) {
    const job = await base44.asServiceRole.entities.Job.get(jobId).catch(() => null);
    if (job?.id) return { job, mapping: null };
  }

  const rows = await base44.asServiceRole.entities.JobCalendarEvent.filter({ event_id: event.id }, '-created_date', 1);
  const mapping = rows[0] || null;
  if (!mapping?.job_id) return { job: null, mapping: null };
  const job = await base44.asServiceRole.entities.Job.get(mapping.job_id).catch(() => null);
  return { job, mapping };
}

async function updateJobFromEvent(base44, event) {
  const { job, mapping } = await findMappingForEvent(base44, event);
  if (!job?.id) return 'no_matching_job';

  if (event.status === 'cancelled') {
    if (job.scheduled_date) {
      await base44.asServiceRole.entities.Job.update(job.id, { scheduled_date: null, preferred_time_window: 'Removed from Google Calendar' });
    }
    return 'unscheduled_deleted_event';
  }

  const nextDate = eventDate(event);
  if (!nextDate) return 'no_event_date';

  const patch = {};
  if (job.scheduled_date !== nextDate) patch.scheduled_date = nextDate;
  if (mapping?.id) patch.updatedAt = new Date().toISOString();

  if (Object.keys(patch).length > 0) {
    await base44.asServiceRole.entities.Job.update(job.id, patch);
  }
  return Object.keys(patch).length > 0 ? 'updated_job_date' : 'already_current';
}

async function fetchChangedEvents(accessToken, calendarId, syncState) {
  const headers = googleHeaders(accessToken);
  let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=100&showDeleted=true`;
  if (syncState?.sync_token) {
    url += `&syncToken=${encodeURIComponent(syncState.sync_token)}`;
  } else {
    url += '&timeMin=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  let response = await fetch(url, { headers });
  if (response.status === 410) {
    url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=100&showDeleted=true&timeMin=${encodeURIComponent(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())}`;
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`Google Calendar incremental sync failed with status ${response.status}`);

  const allItems = [];
  let pageData = await response.json();
  let newSyncToken = pageData.nextSyncToken || null;

  while (true) {
    allItems.push(...(pageData.items || []));
    if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
    if (!pageData.nextPageToken) break;
    const nextResponse = await fetch(`${url}&pageToken=${encodeURIComponent(pageData.nextPageToken)}`, { headers });
    if (!nextResponse.ok) throw new Error(`Google Calendar page sync failed with status ${nextResponse.status}`);
    pageData = await nextResponse.json();
  }

  return { items: allItems, syncToken: newSyncToken };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const state = body?.data?._provider_meta?.['x-goog-resource-state'];
    if (state === 'sync') return jsonResponse({ status: 'sync_ack' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const calendarId = await getOrCreateRepairsCalendar(accessToken);
    const syncState = await getSyncState(base44, calendarId);
    const { items, syncToken } = await fetchChangedEvents(accessToken, calendarId, syncState);

    const results = [];
    for (const event of items) {
      results.push({ event_id: event.id, result: await updateJobFromEvent(base44, event) });
    }

    if (syncToken) {
      await base44.asServiceRole.entities.SyncState.update(syncState.id, {
        sync_token: syncToken,
        calendar_id: calendarId,
        last_synced_at: new Date().toISOString(),
      });
    }

    return jsonResponse({ synced: true, checked: items.length, results });
  } catch (error) {
    console.error('[syncGoogleCalendarToJobs] failed:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});