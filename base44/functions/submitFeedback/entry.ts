import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Feedback is admin-only at the entity level (RLS), so submissions from
// regular users flow through this function using the service role —
// after verifying the caller is a signed-in user.

const TYPES = ["Bug Report", "Feature Request", "General Feedback", "UI / UX Issue", "Performance Issue", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Please sign in to send feedback.' }, { status: 401 });
        }

        const body = await req.json();
        const subject = (body.subject || "").trim();
        const message = (body.message || "").trim();
        if (!subject || !message) {
            return Response.json({ error: 'Subject and message are required.' }, { status: 400 });
        }

        const record = await base44.asServiceRole.entities.Feedback.create({
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
            attachment: (body.attachment || "").slice(0, 1000),
            is_archived: false,
            upvotes: 0,
            tags: [],
        });

        return Response.json({ ok: true, id: record.id });
    } catch (error) {
        console.error('[submitFeedback] failed:', error?.message, error?.stack);
        return Response.json({ error: 'Something went wrong sending your feedback. Please try again.' }, { status: 500 });
    }
});