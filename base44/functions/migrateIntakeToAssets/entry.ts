import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// One-time migration: copies asset-specific fields from job.intake to the
// matching Scooter record, then clears job.intake. Admin-only.
// Matching priority: job.asset_id → make/model from intake/booking.

function cleanText(value) {
  return String(value || '').trim().toLowerCase();
}

function scooterMatches(scooter, make, model, serial) {
  const sSerial = cleanText(scooter.serial_number);
  if (serial && sSerial && sSerial === cleanText(serial)) return true;
  return !!cleanText(model) && cleanText(scooter.make) === cleanText(make) && cleanText(scooter.model) === cleanText(model);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (String(user.role || '').toLowerCase() !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const entities = base44.asServiceRole.entities;
    const jobs = await entities.Job.list('-updated_date', 1000);
    const jobsWithIntake = jobs.filter((j) => j.intake && j.intake.intake_date);

    let migrated = 0;
    let skipped = 0;
    let cleared = 0;
    const errors = [];

    for (const job of jobsWithIntake) {
      try {
        const intake = job.intake;
        const make = intake.make || intake.scooterMake || '';
        const model = intake.model || intake.scooterModel || '';
        const serial = intake.serial_number || '';

        // Find matching scooter
        let scooter = null;
        if (job.asset_id) {
          scooter = await entities.Scooter.get(job.asset_id).catch(() => null);
        }
        if (!scooter && (make || model)) {
          const stableId = job.customer_id || job.customer_account_id || '';
          const candidates = stableId
            ? await entities.Scooter.filter({ customer_id: stableId }, '-updated_date', 100).catch(() => [])
            : [];
          scooter = candidates.find((s) => scooterMatches(s, make, model, serial)) || null;
        }

        if (scooter) {
          const updates = {};
          // Copy scooter-level fields if missing
          if (serial && !scooter.serial_number) updates.serial_number = serial;
          if (intake.battery_voltage && !scooter.battery_voltage) updates.battery_voltage = intake.battery_voltage;
          if (intake.odometer_km != null && intake.odometer_km !== '' && scooter.odometer_km == null) {
            updates.odometer_km = Number(intake.odometer_km);
          }

          // Build intake object (asset-specific fields only)
          const existingIntake = scooter.intake || {};
          const newIntake = {
            ...existingIntake,
            battery_condition: existingIntake.battery_condition || intake.battery_condition || undefined,
            physical_condition: existingIntake.physical_condition || intake.physical_condition || undefined,
            accessories_received: existingIntake.accessories_received || intake.accessories_received || undefined,
            powers_on: existingIntake.powers_on !== undefined ? existingIntake.powers_on : (intake.powers_on !== false),
            initial_issue_notes: existingIntake.initial_issue_notes || intake.initial_issue_notes || intake.issueOrService || undefined,
            intake_by_name: existingIntake.intake_by_name || intake.intake_by_name || undefined,
            intake_date: existingIntake.intake_date || intake.intake_date || undefined,
          };
          // Only update if no existing intake or new data adds value
          if (!existingIntake.intake_date || Object.keys(newIntake).some((k) => !existingIntake[k] && newIntake[k])) {
            updates.intake = newIntake;
          }

          if (Object.keys(updates).length) {
            await entities.Scooter.update(scooter.id, updates);
            migrated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }

        // Clear job.intake regardless (migration attempted)
        await entities.Job.update(job.id, { intake: null });
        cleared++;
      } catch (e) {
        errors.push({ job_id: job.id, error: e.message });
      }
    }

    return Response.json({
      total_jobs_with_intake: jobsWithIntake.length,
      migrated,
      skipped,
      cleared,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('[migrateIntakeToAssets] failed:', error?.message, error?.stack);
    return Response.json({ error: error.message || 'Migration failed' }, { status: 500 });
  }
});