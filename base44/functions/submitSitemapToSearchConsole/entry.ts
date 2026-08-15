import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const SITE_URL = 'https://ontherunelectrics.com.au';

function clean(value: unknown, maxLength = 500) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

export default async function (req: Request): Promise<Response> {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  try {
    if (req.method !== 'POST') return Response.json({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST for this action.' }, request_id: requestId }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ ok: false, error: { code: 'unauthorized', message: 'Sign in to continue.' }, request_id: requestId }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ ok: false, error: { code: 'forbidden', message: 'Administrator access is required.' }, request_id: requestId }, { status: 403 });
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');
    const siteUrl = 'sc-domain:ontherunelectrics.com.au';
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error('[submitSitemapToSearchConsole]', JSON.stringify({ request_id: requestId, code: 'provider_rejected', status: response.status }));
      return Response.json({ ok: false, error: { code: 'provider_rejected', message: 'Search Console did not accept the sitemap submission.' }, request_id: requestId }, { status: 502 });
    }
    return Response.json({ ok: true, data: { submitted: sitemapUrl }, request_id: requestId });
  } catch (error) {
    console.error('[submitSitemapToSearchConsole]', JSON.stringify({ request_id: requestId, code: 'submission_failed', message: clean(error?.message || error) }));
    return Response.json({ ok: false, error: { code: 'submission_failed', message: 'The sitemap could not be submitted.' }, request_id: requestId }, { status: 500 });
  }
}
