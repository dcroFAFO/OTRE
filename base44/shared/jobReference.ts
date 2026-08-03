// Single source of truth for the human-facing job identifier.
//
// `Job.reference` (e.g. OTR-48213) is the ONLY identifier shown to customers and
// staff, and the one quoted in emails, SMS and the portal. `Job.job_id` is
// DEPRECATED: it only ever held a copy of the record id, was never populated on
// most records, and is no longer written by anything. The field is retained on
// the entity purely so existing records are not broken — never read it in new
// code, use `job.id` for lookups and `job.reference` for display.
//
// Previously createBooking and staffCreateJob each carried their own generator
// producing different formats and neither checked for collisions.

const PREFIX = 'OTR';
const MAX_ATTEMPTS = 25;

function candidate() {
  return `${PREFIX}-${Math.floor(Math.random() * 90000) + 10000}`;
}

/**
 * Mints a job reference that is not already in use.
 * @param db base44.asServiceRole.entities
 */
export async function mintJobReference(db) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const reference = candidate();
    const existing = await db.Job.filter({ reference }, '', 1).catch(() => []);
    if (existing.length === 0) return reference;
  }
  throw new Error('Unable to mint a unique job reference');
}