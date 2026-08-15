import { describe, expect, it } from "vitest";
import { assignableRoles, hasAtLeastRole, isStaffRole, normalizeRole } from "@/config/roles";
import { can } from "@/config/permissions";

describe("canonical UI roles", () => {
  it.each(["technician", "employee", "staff", "unexpected", null])("normalizes %s to customer without staff access", (role) => {
    expect(normalizeRole(role)).toBe("customer");
    expect(isStaffRole(role)).toBe(false);
    expect(can(role, "job.view.own")).toBe(true);
    expect(can(role, "log.view")).toBe(false);
  });

  it("requires admin for legacy staff route requirements", () => {
    expect(hasAtLeastRole("admin", "technician")).toBe(true);
    expect(hasAtLeastRole("customer", "technician")).toBe(false);
    expect(hasAtLeastRole("technician", "technician")).toBe(false);
  });

  it("exposes only admin and customer as assignable UI roles", () => {
    expect(assignableRoles("admin")).toEqual(["admin", "customer"]);
    expect(assignableRoles("customer")).toEqual(["customer"]);
  });
});
