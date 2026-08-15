import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "base44/functions/customerSettings/entry.ts"),
  "utf8",
);

describe("customerSettings scooter linkage contract", () => {
  it("treats an asset_id-only job relationship as service history before list, delete, or archive", () => {
    const linkageHelper = source.match(/async function hasLinkedJobs[\s\S]*?\n\}/)?.[0] || "";
    expect(linkageHelper).toMatch(/scooter\.job_id/);
    expect(linkageHelper).toMatch(/Job\.filter\(\s*\{ asset_id: scooter\.id \}/);
    expect(linkageHelper).toMatch(/return true;[\s\S]*linkage check failed[\s\S]*return true;/);

    const listBlock = source.match(/async function listScooters[\s\S]*?\n\}/)?.[0] || "";
    expect(listBlock).toMatch(/has_jobs:\s*await hasLinkedJobs\(db, s\)/);

    expect(source).toMatch(/if \(body\.action === "deleteScooter"\)[\s\S]*?if \(await hasLinkedJobs\(db, scooter\)\)/);
  });
});
