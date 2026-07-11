// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  authorizeInvoiceCheckout,
  authorizeStaff,
  isAdminUser,
  isStaffUser,
  userRole,
} from "../../base44/functions/_shared/authorization";

describe("staff authorization", () => {
  it.each(["admin", "employee", "technician", "staff"])("accepts explicit %s roles", (role) => {
    expect(isStaffUser({ id: `user-${role}`, role })).toBe(true);
    expect(authorizeStaff({ id: `user-${role}`, role })).toEqual({ allowed: true, reason: "staff" });
  });

  it("normalizes explicit role casing", () => {
    expect(userRole({ id: "admin-1", role: " Admin " })).toBe("admin");
    expect(isAdminUser({ id: "admin-1", role: " Admin " })).toBe(true);
  });

  it("rejects anonymous and customer actors", () => {
    expect(authorizeStaff(null)).toEqual({ allowed: false, reason: "unauthenticated" });
    expect(authorizeStaff({ id: "customer-1", role: "customer" })).toEqual({ allowed: false, reason: "staff_required" });
  });

  it("does not treat mutable customer flags or nested data roles as staff authority", () => {
    expect(isStaffUser({ id: "customer-1", role: "customer", is_customer: false })).toBe(false);
    expect(isStaffUser({ id: "customer-1", data: { role: "admin", is_customer: false } })).toBe(false);
  });
});

describe("invoice checkout authorization", () => {
  const invoice = {
    id: "invoice-1",
    job_id: "job-1",
    customer_id: "customer-1",
    invoiceVisibility: "customer_visible",
  };
  const job = {
    id: "job-1",
    customer_id: "customer-1",
    customer_user_id: "user-customer-1",
    customer_email: "rider@example.com",
  };

  it("rejects anonymous callers", () => {
    expect(authorizeInvoiceCheckout(null, invoice, job)).toEqual({ allowed: false, reason: "unauthenticated" });
  });

  it("allows staff to start checkout for internal invoices", () => {
    expect(authorizeInvoiceCheckout(
      { id: "tech-1", role: "technician" },
      { ...invoice, invoiceVisibility: "internal" },
      job,
    )).toEqual({ allowed: true, reason: "staff" });
  });

  it("allows the directly linked customer user", () => {
    expect(authorizeInvoiceCheckout(
      { id: "user-customer-1", role: "customer" },
      invoice,
      job,
    )).toEqual({ allowed: true, reason: "owner_user" });
  });

  it("allows a customer with the matching stable customer id", () => {
    expect(authorizeInvoiceCheckout(
      { id: "user-2", role: "customer", data: { customer_id: "customer-1" } },
      invoice,
      job,
    )).toEqual({ allowed: true, reason: "owner_customer" });
  });

  it("allows a customer with the matching customer account id", () => {
    expect(authorizeInvoiceCheckout(
      { id: "user-3", role: "customer", customer_account_id: "account-1" },
      { ...invoice, customer_id: "", customer_account_id: "account-1" },
      { ...job, customer_id: "", customer_user_id: "", customer_account_id: "account-1" },
    )).toEqual({ allowed: true, reason: "owner_customer" });
  });

  it("allows a legacy job matched by authenticated email", () => {
    expect(authorizeInvoiceCheckout(
      { id: "user-legacy", role: "customer", email: " Rider@Example.com " },
      { ...invoice, customer_id: "" },
      { ...job, customer_id: "", customer_user_id: "" },
    )).toEqual({ allowed: true, reason: "owner_email" });
  });

  it("rejects a customer who owns a different account", () => {
    expect(authorizeInvoiceCheckout(
      { id: "attacker", role: "customer", data: { customer_id: "customer-2" }, email: "other@example.com" },
      invoice,
      job,
    )).toEqual({ allowed: false, reason: "not_owner" });
  });

  it("rejects customer access to an internal invoice", () => {
    expect(authorizeInvoiceCheckout(
      { id: "user-customer-1", role: "customer" },
      { ...invoice, invoiceVisibility: "internal" },
      job,
    )).toEqual({ allowed: false, reason: "invoice_not_visible" });
  });

  it("rejects an invoice/job record mismatch", () => {
    expect(authorizeInvoiceCheckout(
      { id: "admin-1", role: "admin" },
      invoice,
      { ...job, id: "different-job" },
    )).toEqual({ allowed: false, reason: "record_mismatch" });
  });
});
