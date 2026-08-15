import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { checkRateLimit, clientIpThrottle } from '../../shared/rateLimit.ts';

// Feedback is admin-only at the entity level (RLS), so submissions from
// regular users flow through this function using the service role —
// after verifying the caller is a signed-in user.

const TYPES = ["Bug Report", "Feature Request", "General Feedback", "UI / UX Issue", "Performance Issue", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];
const MAX_GLOBAL_FEEDBACK = 500;

Deno.serve(async (req) => {
    try {
        if (req.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        if (!user) {
            return Response.json({ error: 'Please sign in to send feedback.' }, { status: 401 });
        }

        const ipThrottle = clientIpThrottle(req, 10, MAX_GLOBAL_FEEDBACK);
        const [userLimit, ipLimit] = await Promise.all([
            checkRateLimit(base44, `feedback:user:${user.id}`, 5),
            checkRateLimit(base44, `feedback:ip:${ipThrottle.key}`, ipThrottle.limit),
        ]);
        if (!userLimit.allowed || !ipLimit.allowed) return Response.json({ error: 'Too many feedback submissions. Please wait before trying again.' }, { status: 429 });

        const body = await req.json().catch(() => ({}));
        const subject = (body.subject || "").trim();
        const message = (body.message || "").trim();
        if (!subject || !message) {
            return Response.json({ error: 'Subject and message are required.' }, { status: 400 });
        }

        let attachmentId = "";
        if (body.attachment_id) {
            const attachment = await base44.asServiceRole.entities.Attachment.get(String(body.attachment_id)).catch(() => null);
            if (!attachment || attachment.kind !== "feedback_evidence" || attachment.uploaded_by_user_id !== user.id || attachment.storage !== "private") {
                return Response.json({ error: 'That feedback attachment is not valid.' }, { status: 400 });
            }
            attachmentId = attachment.id;
        }

        const idempotencyKey = String(body.idempotency_key || '').trim().slice(0, 200);
        if (!/^[A-Za-z0-9:_-]{8,200}$/.test(idempotencyKey)) return Response.json({ error: 'A valid submission key is required.' }, { status: 400 });
        const existing = await base44.asServiceRole.entities.Feedback.filter({ submission_key: idempotencyKey, submitted_by: user.id }, '-created_date', 1).catch(() => []);
        if (existing[0]) return Response.json({ ok: true, id: existing[0].id, duplicate: true });

        let record;
        try {
            record = await base44.asServiceRole.entities.Feedback.create({
                subject: subject.slice(0, 200),
                feedback_type: TYPES.includes(body.feedback_type) ? body.feedback_type : "General Feedback",
                message: message.slice(0, 5000),
                priority: PRIORITIES.includes(body.priority) ? body.priority : "Medium",
                status: "New",
                submitted_by: user.id,
                submitted_by_name: user.full_name || "",
                submitted_by_email: user.email || "",
                page_context: (body.page_context || "").slice(0, 500),
                device_context: (body.device_context || "").slice(0, 200),
                app_context: (body.app_context || "").slice(0, 500),
                attachment_id: attachmentId,
                is_archived: false,
                upvotes: 0,
                tags: [],
                submission_key: idempotencyKey,
            });
        } catch (createError) {
            const raced = await base44.asServiceRole.entities.Feedback.filter({ submission_key: idempotencyKey, submitted_by: user.id }, '-created_date', 1).catch(() => []);
            if (raced[0]) return Response.json({ ok: true, id: raced[0].id, duplicate: true });
            throw createError;
        }

        return Response.json({ ok: true, id: record.id });
    } catch (error) {
        console.error('[submitFeedback]', JSON.stringify({ code: 'submission_failed', message: String(error?.message || error).slice(0, 300) }));
        return Response.json({ error: 'Something went wrong sending your feedback. Please try again.' }, { status: 500 });
    }
});
