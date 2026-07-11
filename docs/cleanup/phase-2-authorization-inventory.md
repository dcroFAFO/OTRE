# Phase 2 authorization and trust-boundary inventory

This inventory classifies every Base44 function and the protected frontend route groups before Phase 2.4 enforcement. A function that is intended for an automation or webhook is not treated as anonymous application functionality; its caller authenticity must be supplied by the platform/provider contract.

## Interactive and public functions

| Function | Intended caller | Current boundary | Phase 2.4 disposition |
| --- | --- | --- | --- |
| `archiveBlogPost` | Staff | Authenticated staff check | Keep; negative policy coverage. |
| `blogAdminData` | Staff | Authenticated staff check | Keep; negative policy coverage. |
| `bookingVerification` | Anonymous booking customer | OTP, expiry, attempt and resend controls | Keep public; do not add account auth. |
| `cancelScheduledBlogPost` | Staff | Authenticated staff check and author ownership | Keep; negative policy coverage. |
| `claimCustomerJobs` | Authenticated customer | Authenticated self-linking logic | Keep customer-only; cover staff/anonymous denial. |
| `createBlogPost` | Staff | Authenticated staff check | Keep; negative policy coverage. |
| `createBooking` | Anonymous or authenticated customer | Server validation and customer-account discrimination | Keep public; booking records remain server-created. |
| `createInvoiceCheckout` | Invoice owner or staff | **Gap:** no authentication or invoice ownership check | Require authentication; customers must own a customer-visible invoice, while staff may operate internal invoices. |
| `createStoreCheckout` | Anonymous store customer | Server-side product lookup; Phase 2.3 now rejects inactive, sold-out, invalid-currency, non-positive-price and invalid-quantity rows | Keep public. |
| `customerActions` | Staff | Authenticated staff check before service-role access | Keep. |
| `customerHistory` | Staff | Authenticated staff check before service-role access | Keep. |
| `customerSettings` | Authenticated customer | Rejects staff and scopes records to the current account | Keep. |
| `generateBlogPost` | Staff | Authenticated staff check and feature setting | Keep. |
| `invoiceActions` | Staff | **Gap:** authenticated customer can reach `create` before action-level staff checks | Require staff before parsing/fetching records; remove redundant later checks. |
| `invoicePdfActions` | Staff | **Gap:** authentication only; service-role job/invoice access | Require staff before record access. |
| `jobActions` | Staff | **Gap:** authentication only for several job mutations; user-mode writes are an incomplete boundary | Require staff before record access for every action. |
| `publicBlog` | Anonymous reader | Published-record projection | Keep public. |
| `publicJobAccessActions` | Tracking-token holder; staff for link management | Hashed, expiring/revocable token plus per-link permissions; staff check for generate/revoke | Keep mixed boundary; retain permission-level negative coverage. |
| `publishBlogPostNow` | Staff | Authenticated staff check and author ownership | Keep. |
| `quoteActions` | Staff | **Gap:** authentication only; relies on downstream RLS | Require staff before service-role job lookup or mutations. |
| `saveBlogSettings` | Staff | Authenticated staff check | Keep. |
| `saveBlogTaxonomy` | Staff | Authenticated staff check | Keep. |
| `scheduleBlogPost` | Staff | Authenticated staff check and author ownership | Keep. |
| `seedPlatform` | Admin | Explicit admin check | Keep admin-only. |
| `sendSignupPhoneOtp` | Anonymous registrant | OTP resend/identity validation | Keep public. |
| `sourcePartsForJob` | Staff | **Gap:** authentication only before service-role job data and AI invocation | Require staff while the function remains; Phase 3 decides removal. |
| `staffCreateJob` | Staff | Explicit staff check | Keep. |
| `submitCustomerFeedback` | Anonymous customer link | Job identifier lookup only | Keep temporarily; Phase 3 must either bind ratings to a tracking capability or remove the unauthenticated job lookup flow. |
| `submitFeedback` | Authenticated user | Explicit authentication and required fields | Keep. |
| `syncEcwidProducts` | Admin | Explicit admin check | Keep admin-only. |
| `updateBlogPost` | Staff | Authenticated staff check and author ownership | Keep. |
| `verifySignupPhoneOtp` | Anonymous registrant | Hashed OTP, expiry and attempts | Keep public. |

## Platform-triggered and provider-triggered functions

| Function | Intended trigger | Current boundary | Required follow-up |
| --- | --- | --- | --- |
| `assignCustomerIdToNewUser` | User entity automation | Event-shape checks; no interactive auth | Verify the deployed entity automation before Phase 3 removes its unsafe manual full-scan fallback. |
| `assignJobIdToNewJob` | Job entity automation | Strict Job-create event shape | Verify deployed automation. |
| `autoGenerateInvoice` | Job update automation | Update/transition event-shape checks | Verify deployed automation and reconcile with the active invoice workflow in Phase 3. |
| `createCustomerForUser` | User entity automation | Event payload or unsafe manual full scan | Verify deployment; remove the manual fallback or the whole duplicate function in Phase 3. |
| `linkJobToCustomer` | Entity-create automations | Create-event and supported-entity checks | Verify deployed automations; consolidate duplicate identity-linking flows in Phase 3. |
| `processScheduledBlogPosts` | Scheduled automation | No interactive auth | Verify the deployed schedule; it must not be exposed as a user action. |
| `syncJobToGoogleCalendar` | Job entity automation | Job payload lookup; no interactive auth | Verify deployed automation and connector scope. |
| `stripeWebhook` | Stripe webhook | Stripe signature and webhook-secret verification | Keep provider-authenticated. |
| `syncGoogleCalendarToJobs` | Google connector callback/schedule | **Gap:** provider metadata is read but source authenticity is not locally verifiable | Verify Base44 connector callback authentication; do not expose this function in UI. |

## Frontend routes

| Route group | Intended role | Current boundary | Phase 2.4 disposition |
| --- | --- | --- | --- |
| `/dashboard/*` | Staff | `DashboardLayout` blocks non-staff before rendering its outlet | Keep. |
| `/dashboard/parts` | Admin | **Gap:** nav is admin-only but route is any staff | Add route-level admin guard. |
| `/admin/clients` | Technician/employee/admin | Page-level guard and query `enabled` check | Add route-level guard so the page never mounts for denied users. |
| `/admin/feedback` | Admin | Page-level guard and query `enabled` check | Add route-level guard. |
| `/admin/activity` | Admin with `log.view` | **Gap:** page query runs before the rendered capability guard | Add route-level guard and an explicit query `enabled` condition. |
| `/portal`, `/portal/account`, `/portal/settings` | Authenticated customer | Each page rejects staff and scopes reads to the current user | Keep; cover negative dashboard/portal routing. |
| `/track/:jobId` | Tracking-token holder | Backend token and capability checks | Keep public route. |

## Phase 2.4 enforcement scope

The implementation scope is limited to active, user-reachable trust boundaries: shared staff/ownership policy helpers; early checks in job, quote, invoice, invoice-PDF, source-parts and invoice-checkout functions; route-level guards; and negative tests proving denied actors cause no protected read or mutation. Platform automation authenticity that cannot be proven from this repository is explicitly retained as a Phase 3 verification/removal dependency rather than guessed.
