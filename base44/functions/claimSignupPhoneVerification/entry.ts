import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

async function sha256(value: unknown) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || "")),
  );
  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function constantTimeEqual(left: unknown, right: unknown) {
  const a = String(left || "");
  const b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

Deno.serve(async (req) => {
  let use: any = null;
  let db: any = null;
  let authenticatedUserId = "";
  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return errorResponse("Sign in to finish mobile verification.", 401);
    }
    if (user.role !== "customer") {
      return errorResponse(
        "Only customer accounts can claim signup verification.",
        403,
      );
    }
    authenticatedUserId = String(user.id || "");

    const email = normalizeEmail(user.email);
    if (!EMAIL_PATTERN.test(email)) {
      return errorResponse(
        "The signed-in account has no valid email address.",
        409,
      );
    }
    const body = await req.json().catch(() => ({}));
    const verificationId = String(body.verification_id || "").trim().slice(
      0,
      160,
    );
    const rawProof = String(body.verification_proof || "").trim().toLowerCase();
    if (!verificationId || !/^[a-f0-9]{64}$/.test(rawProof)) {
      return errorResponse(
        "A valid mobile verification proof is required.",
        400,
      );
    }

    db = base44.asServiceRole.entities;
    const proofs = await db.PhoneVerificationProof.filter(
      { phone_verification_id: verificationId },
      "-created_date",
      2,
    ).catch(() => []);
    if (proofs.length !== 1) {
      return errorResponse(
        "Mobile verification is invalid or unavailable.",
        409,
      );
    }
    const proof = proofs[0];
    if (normalizeEmail(proof.email) !== email) {
      return errorResponse(
        "Mobile verification belongs to another email account.",
        403,
      );
    }
    if (!constantTimeEqual(await sha256(rawProof), proof.proof_hash)) {
      return errorResponse("Mobile verification proof is invalid.", 403);
    }

    const existing = await db.PhoneVerificationUse.filter(
      { phone_verification_id: verificationId },
      "-created_date",
      2,
    ).catch(() => []);
    use = existing[0] || null;
    if (use && use.user_id !== user.id) {
      return errorResponse("Mobile verification was already claimed.", 409);
    }
    const expiresAt = new Date(proof.proof_expires_at || 0).getTime();
    if (!use && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
      return errorResponse(
        "Mobile verification expired. Request a new code.",
        410,
      );
    }
    if (!use) {
      try {
        use = await db.PhoneVerificationUse.create({
          phone_verification_id: verificationId,
          attempt_id: proof.attempt_id,
          proof_id: proof.id,
          user_id: user.id,
          email,
          phone_e164: proof.phone_e164,
          phone_hash: await sha256(proof.phone_e164),
          status: "reserved",
          reserved_at: new Date().toISOString(),
        });
      } catch (error) {
        const raced = await db.PhoneVerificationUse.filter(
          { phone_verification_id: verificationId },
          "-created_date",
          2,
        ).catch(() => []);
        use = raced[0] || null;
        if (!use || use.user_id !== user.id) {
          throw error;
        }
      }
    }

    if (use.status !== "completed") {
      const completedAt = new Date().toISOString();
      await db.User.update(user.id, {
        phone: proof.phone_e164,
        phone_e164: proof.phone_e164,
        phone_verified: true,
      });
      use = await db.PhoneVerificationUse.update(use.id, {
        status: "completed",
        completed_at: completedAt,
        consumed_at: completedAt,
        failure_code: "",
      });
      await db.PhoneVerification.update(verificationId, {
        consumed_at: completedAt,
        consumed_by_user_id: user.id,
      }).catch(() => null);
    }

    return Response.json({
      verified: true,
      phone_e164: proof.phone_e164,
      claimed: true,
      replay: use.status === "completed" && Boolean(existing[0]),
    });
  } catch (error) {
    if (
      use?.id && db && use.user_id === authenticatedUserId &&
      use.status !== "completed"
    ) {
      await db.PhoneVerificationUse.update(use.id, {
        status: "failed",
        failure_code: "PHONE_CLAIM_FAILED",
      }).catch(() => null);
    }
    console.error(
      "[claimSignupPhoneVerification] failed",
      error instanceof Error ? error.message : String(error),
    );
    return errorResponse(
      "Mobile verification could not be linked to this account. Please retry.",
      500,
    );
  }
});
