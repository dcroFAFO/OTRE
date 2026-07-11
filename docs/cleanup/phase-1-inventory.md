# OTRE cleanup inventory

This is the Phase 1 disposition register for the repository at commit `64a4cde68bce`. It prevents reachability-based deletion from removing required Base44 runtime entry points and gives later cleanup phases an explicit migration target.

## Classification rules

Every inventory item has one primary disposition:

- **Keep**: active behavior with no known replacement requirement; normal defects may still be fixed.
- **Repair**: active or required behavior with a known correctness, authorization, data, or completeness gap.
- **Replace**: retain behavior but replace the implementation before deleting the old code.
- **Migrate, then remove**: records, callers, or external triggers must move to the canonical replacement before deletion.
- **Remove**: confirmed duplicate, placeholder, abandoned, or statically unreachable code with an active replacement or no supported product behavior.
- **External runtime entry point**: intentionally may have no frontend caller; preserve until its webhook, schedule, connector, or entity-automation trigger is source-controlled and tested.

This inventory authorizes investigation and sequencing. Destructive removal still requires a clean reference scan, passing tests, and proof that no external trigger depends on the item.

## Routes

| Route | Surface | Disposition | Required cleanup |
| --- | --- | --- | --- |
| `/` | Public landing | Keep | Preserve marketing surface; split the route bundle later. |
| `/book` | Booking entry/auth choice | Repair | Align account and guest flow contracts. |
| `/about` | Public information | Keep | Preserve. |
| `/contact` | Public contact | Repair | Consume canonical business configuration. |
| `/book/guest` | Guest booking | Repair | Return and deliver a secure tracking link. |
| `/profile-setup` | Customer onboarding | Repair | Use the canonical customer resolver and migration-safe fields. |
| `/portal` | Customer jobs portal | Repair | Remove claim-on-read behavior and align quote/invoice visibility. |
| `/portal/settings` | Customer settings | Repair | Move CustomerProfile data to the canonical customer model. |
| `/portal/account` | Customer account summary | Repair | Remove unsupported referral placeholders or implement the feature. |
| `/store` | Public catalogue/checkout | Repair | Complete return-state handling and staff order fulfilment. |
| `/blog` | Public blog index | Keep | Preserve. |
| `/blog/:slug` | Public blog post | Keep | Preserve. |
| `/blog/category/:slug` | Blog category | Keep | Preserve. |
| `/blog/tag/:slug` | Blog tag | Keep | Preserve. |
| `/login` | Authentication | Keep | Preserve with regression tests. |
| `/register` | Customer registration | Repair | Test and rate-limit the phone/email verification contract. |
| `/forgot-password` | Password recovery | Keep | Preserve with smoke coverage. |
| `/reset-password` | Password reset | Keep | Preserve with smoke coverage. |
| `/feedback` | Job-linked rating | Repair | Require job ownership or a tracking capability. |
| `/track/:jobId` | Guest tracking | Repair | Use token-hash lookup, show quotes, and fix payment return URLs. |
| `/dashboard` | Staff overview | Repair | Replace legacy status metrics and nest all staff/admin routes consistently. |
| `/dashboard/jobs` | Job operations | Repair | Enforce the workflow server-side and remove duplicate job controls. |
| `/dashboard/calendar` | Repair calendar | Repair | Define and secure the Google Calendar synchronization contract. |
| `/dashboard/invoices` | Invoice list | Repair | Add a working detail destination and use persisted due dates. |
| `/dashboard/parts` | Parts catalogue | Repair | Align route authorization and the Product/InventoryItem boundary. |
| `/dashboard/blog` | Blog administration | Keep | Preserve. |
| `/dashboard/blog/posts` | Blog posts | Keep | Preserve. |
| `/dashboard/blog/posts/:id` | Blog editor | Keep | Preserve. |
| `/dashboard/blog/generate` | AI blog generation | Repair | Add explicit authorization/rate controls and deterministic failure handling. |
| `/dashboard/blog/taxonomy` | Blog taxonomy | Keep | Preserve. |
| `/dashboard/blog/settings` | Blog settings | Keep | Preserve. |
| `/dashboard/blog/logs` | Blog logs | Keep | Preserve. |
| `/settings` | System settings | Repair | Align access policy and make saved values drive backend calculations. |
| `/asset-management` | Scooter administration | Repair | Align route controls with entity RLS. |
| `/service-pricing` | Service configuration | Repair | Make pricing authoritative or remove false configurability. |
| `/admin/feedback` | Feedback administration | Repair | Nest beneath the common dashboard shell and retain admin-only access. |
| `/admin/clients` | Customer CRM | Repair | Remove mutation-on-read and use one customer identity resolver. |
| `/admin/activity` | Audit log | Repair | Avoid fetching before authorization and use the common dashboard shell. |
| `/customers` | Legacy alias | Migrate, then remove | Update internal/external links to `/admin/clients`; retain temporarily for compatibility. |
| `/job-board` | Legacy alias | Migrate, then remove | Update links to `/dashboard/jobs`; retain temporarily for compatibility. |
| `/parts-catalogue` | Legacy alias | Migrate, then remove | Update links to `/dashboard/parts`; retain temporarily for compatibility. |
| `*` | Not-found route | Keep | Preserve. |

## Base44 functions

| Function | Disposition | Invocation/required cleanup |
| --- | --- | --- |
| `archiveBlogPost` | Keep | Authenticated blog-owner operation. |
| `assignCustomerIdToNewUser` | Migrate, then remove | Legacy entity-automation candidate; consolidate into canonical onboarding/claim logic after trigger verification. |
| `assignJobIdToNewJob` | Migrate, then remove | Legacy ID-assignment automation; canonical creation functions should write the final reference. |
| `autoGenerateInvoice` | Migrate, then remove | Duplicates invoice creation/readiness behavior; migrate to guarded `invoiceActions`. |
| `blogAdminData` | Keep | Active blog administration query. |
| `bookingVerification` | Repair | Public OTP surface; retain but test throttling, ownership projection, and abuse limits. |
| `cancelScheduledBlogPost` | Keep | Active authenticated blog operation. |
| `claimCustomerJobs` | Repair | Retain as explicit migration/claim operation; remove broad fallback joins and repeated read-time invocation. |
| `createBlogPost` | Keep | Active authenticated blog operation. |
| `createBooking` | Repair | Active public/account booking entry point; fix tracking delivery, canonical writes, and deduplication. |
| `createCustomerForUser` | Migrate, then remove | Consolidate with profile setup and `claimCustomerJobs` after external-trigger verification. |
| `createInvoiceCheckout` | Repair | Add authentication/capability, ownership, visibility, relationship, and idempotency checks. |
| `createStoreCheckout` | Repair | Active public checkout; complete order-return and fulfilment behavior. |
| `customerActions` | Repair | Active staff CRM service; remove repair-on-read and centralize identity resolution. |
| `customerHistory` | Repair | Make reads pure; move reconciliation into explicit migration commands. |
| `customerSettings` | Repair | Active customer settings API; migrate away from duplicated CustomerProfile fields. |
| `generateBlogPost` | Repair | Active LLM surface; enforce role, rate, and error contracts. |
| `invoiceActions` | Repair | Add the missing staff guard to create and enforce invoice/job/payment transitions. |
| `invoicePdfActions` | Repair | Use valid business data and either send an email or rename the operation to portal publication. |
| `jobActions` | Repair | Enforce staff access and transition prerequisites server-side. |
| `linkJobToCustomer` | Migrate, then remove | Legacy linking automation; replace with the canonical resolver and migration tooling. |
| `processScheduledBlogPosts` | External runtime entry point | Retain; add a source-controlled/documented schedule, idempotency, and tests. |
| `publicBlog` | Keep | Intentional public read endpoint. |
| `publicJobAccessActions` | Repair | Retain; change to hash-first access lookup, fix payment URLs, and align quote permissions/UI. |
| `publishBlogPostNow` | Keep | Active authenticated blog operation. |
| `quoteActions` | Repair | Separate staff pricing actions from customer decisions and use configured pricing. |
| `saveBlogSettings` | Keep | Active authenticated blog operation. |
| `saveBlogTaxonomy` | Keep | Active authenticated blog operation. |
| `scheduleBlogPost` | Keep | Active operation whose external publisher trigger must also be configured. |
| `seedPlatform` | Repair | Fix stale business data, undefined entity use, canonical statuses, and dry-run/idempotent reporting. |
| `sendSignupPhoneOtp` | Repair | Intentional public auth endpoint; retain with abuse/rate tests. |
| `sourcePartsForJob` | Remove | Dormant AI experiment paired with an unreachable panel; remove unless explicitly reintroduced through the active part picker with staff authorization. |
| `staffCreateJob` | Repair | Canonical staff creation path; write canonical fields and references only. |
| `stripeWebhook` | External runtime entry point | Required signed webhook; preserve and add event idempotency plus deployment registration documentation. |
| `submitCustomerFeedback` | Repair | Require authenticated ownership or valid tracking access. |
| `submitFeedback` | Repair | Intentional public/global feedback endpoint; retain with validation, upload limits, and abuse controls. |
| `syncEcwidProducts` | Repair | Active staff-triggered supplier sync; align route/function role policy and catalogue-only semantics. |
| `syncGoogleCalendarToJobs` | External runtime entry point | Preserve until the two-way sync decision is made; secure and document its callback/trigger. |
| `syncJobToGoogleCalendar` | External runtime entry point | Preserve as app-to-calendar automation; source-control/document its entity trigger. |
| `updateBlogPost` | Keep | Active authenticated blog operation. |
| `verifySignupPhoneOtp` | Repair | Intentional public auth endpoint; retain with attempt, expiry, and replay tests. |

## Base44 entities

| Entity | Disposition | Required cleanup |
| --- | --- | --- |
| `AppSetting` | Repair | Retain global application settings but define explicit access expectations and typed values. |
| `Attachment` | Repair | Retain; make job/customer/public visibility rules consistent and validate upload ownership. |
| `AuditEvent` | Keep | Canonical append-only operational audit record. |
| `BlogCategory` | Keep | Active blog entity. |
| `BlogLog` | Keep | Active blog audit entity. |
| `BlogPost` | Keep | Active blog entity. |
| `BlogSettings` | Keep | Active blog configuration. |
| `BlogTag` | Keep | Active blog entity. |
| `BookingFieldConfig` | Remove | Unused form-builder configuration; active booking forms use code-defined fields. |
| `BusinessProfile` | Repair | Add `abn` and `is_default`; seed and consume current Brisbane details. |
| `BusinessSetting` | Repair | Retain as the canonical typed business-operation settings store. |
| `Customer` | Repair | Make this the canonical CRM/customer record linked explicitly to User. |
| `CustomerNote` | Keep | Active internal CRM notes. |
| `CustomerProfile` | Migrate, then remove | Merge required customer-facing fields into canonical Customer records after a staged data migration. |
| `Feedback` | Repair | Retain; align public submission with admin RLS and job-ownership rules. |
| `InventoryItem` | Repair | Canonical owned workshop stock record. |
| `InventoryUsage` | Repair | Add explicit Product versus InventoryItem references and reconcile stock movements. |
| `Invoice` | Repair | Add persisted issue/due/total fields and enforce staff/system writes. |
| `InvoiceSetting` | Migrate, then remove | Move active invoice configuration into typed BusinessSetting values or canonical code configuration. |
| `Job` | Repair | Migrate duplicate identifiers, customer links, issue fields, statuses, and timestamps. |
| `JobCalendarEvent` | Repair | Retain if calendar sync remains supported; clarify event ownership and direction. |
| `JobNote` | Repair | Retain; fix boolean RLS conditions and explicit customer/internal visibility. |
| `JobStatus` | Migrate, then remove | Runtime uses code-defined canonical statuses; migrate records and remove false configurability. |
| `JobTemplate` | Repair | Retain active staff templates but align fields with `staffCreateJob`. |
| `JobType` | Migrate, then remove | Runtime uses code-defined job types; remove the unused configuration table after seed cleanup. |
| `NotificationSetting` | Migrate, then remove | No active settings/template consumer; remove unless a supported notification-preferences feature is implemented. |
| `Order` | Repair | Complete payment, staff fulfilment, and status-management workflow. |
| `PaymentProviderConfig` | Migrate, then remove | Stripe is environment configured; remove unused database provider configuration. |
| `PhoneVerification` | Repair | Retain OTP state with expiry, attempt, throttling, and replay invariants. |
| `Product` | Repair | Canonical external supplier/store catalogue, not workshop stock. |
| `PublicJobAccess` | Repair | Make token hash the lookup key; add expiry/revocation/rotation consistently. |
| `Quote` | Repair | Restrict writes, persist canonical totals, and separate staff/customer actions. |
| `QuoteTemplate` | Migrate, then remove | Runtime uses code-defined fields; remove unused template configuration after seed cleanup. |
| `Role` | Migrate, then remove | Auth roles are code/platform-defined; eliminate the unused entity after confirming no deployment automation reads it. |
| `Scooter` | Repair | Retain as canonical customer asset with one customer relationship. |
| `ScooterModel` | Keep | Active make/model reference catalogue. |
| `ServiceCategory` | Repair | Retain and align mutation access with staff policy. |
| `ServiceItem` | Repair | Retain; ensure configured prices are either authoritative or clearly informational. |
| `SocialConnection` | Keep | Active customer profile connection record. |
| `StaffProfile` | Repair | Retain only fields used by staff assignment/profile behavior and align role naming. |
| `SyncState` | Repair | Retain only if calendar incremental sync remains supported. |
| `User` | Keep | Base44 authentication identity; document platform-managed access behavior. |

## Agents and connectors

| Resource | Disposition | Required cleanup |
| --- | --- | --- |
| `repair_assistant` agent | Remove | The landing widget uses its own deterministic flow and direct LLM invocation; remove the unused agent unless the widget is deliberately migrated to it. |
| `support_assistant` agent | Repair | Active portal support agent; verify customer-scoped data tools and conversation authorization. |
| `googlecalendar` connector | External runtime entry point | Preserve while deciding one-way/two-way sync; source-control or document trigger and OAuth deployment requirements. |

## Major active component groups

| Group | Disposition | Required cleanup |
| --- | --- | --- |
| `AuthContext`, auth pages, `AuthLayout` | Repair | Add regression coverage and keep authorization decisions out of presentation-only components. |
| `SEO`, `ScrollToTop`, public shell | Keep | Preserve; move business strings to canonical configuration where applicable. |
| Active landing sections | Repair | Preserve current page, centralize business content, and lazy-load heavy interactive code. |
| `RepairAssistantWidget` | Repair | Retain deterministic UX; remove unused agent/stub code and protect LLM/OTP calls. |
| `PublicBookingForm`, `CustomerBookingModal` | Repair | Consume one booking contract and expose tracking for guests. |
| Portal job, account, settings, tutorial, support components | Repair | Migrate identity fields, remove referral placeholders, and align quote/invoice visibility. |
| `DashboardLayout` and `DashboardShell` | Repair | Nest admin routes once and align route, nav, function, and RLS policy. |
| Overview metrics/charts/turnaround components | Repair | Replace legacy status filters and add tested metric selectors. |
| Jobs board/list/filter/lifecycle components | Repair | Use one canonical status model and server-validated transitions. |
| Job detail intake, billing, notes, files, timeline and mobile tabs | Repair | Remove duplicated panels and consume canonical record types. |
| Calendar board/timeline components | Repair | Fix component contracts and define external sync behavior. |
| CRM/admin customer components | Repair | Remove mutation-on-read and broken invoice destinations. |
| Feedback components | Repair | Preserve global feedback; secure job-linked feedback. |
| Store catalogue/cart/checkout components | Repair | Complete payment return and order-management behavior. |
| Blog public/admin components | Keep | Preserve; scheduled publishing remains dependent on its external runtime entry point. |
| Settings/pricing/assets components | Repair | Align route authorization and make configuration authoritative. |

## Unreachable frontend modules

The following 46 modules are not reachable from `src/main.jsx` through static imports or literal dynamic imports at baseline.

| Module(s) | Disposition | Rationale |
| --- | --- | --- |
| `src/components/ProtectedRoute.jsx` | Remove | Replaced by current route/layout authorization. |
| `src/components/booking/PreferredDateField.jsx` | Remove | Unused booking-field implementation. |
| `src/components/dashboard/job/JobActions.jsx` | Remove | Replaced by active header/workflow controls and contains a broken `assignTechnician` import. |
| `src/components/dashboard/job/JobChecklistPanel.jsx` | Remove | Unused duplicate checklist presentation. |
| `src/components/dashboard/job/JobStoreProductsPanel.jsx` | Remove | Replaced by active part-picker/usage flow. |
| `src/components/dashboard/job/NewJobFromTemplateModal.jsx` | Remove | Replaced by `CreateJobModal` and `staffCreateJob`. |
| `src/components/dashboard/job/PartsSourcingPanel.jsx` | Remove | Dormant AI sourcing slice; paired backend function is also classified for removal. |
| `src/components/dashboard/notifications/InboxMultiSelect.jsx` | Remove | Abandoned notification UI with no active inbox surface. |
| `src/components/landing/BookingSection.jsx` | Remove | Replaced by dedicated booking routes and `PublicBookingForm`. |
| `src/components/landing/BookingSignInGate.jsx` | Remove | Only supports the obsolete landing booking section. |
| `src/components/landing/JourneyCard.jsx` | Remove | Active journey section no longer imports it. |
| `src/components/landing/PortalPreviewSection.jsx` | Remove | Unused marketing preview. |
| `src/components/landing/useCustomerPortalRedirect.jsx` | Remove | Only supports unreachable landing components. |
| `src/components/ui/accordion.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/alert.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/aspect-ratio.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/avatar.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/breadcrumb.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/calendar.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/carousel.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/chart.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/collapsible.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/context-menu.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/drawer.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/dropdown-menu.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/form.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/hover-card.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/menubar.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/navigation-menu.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/pagination.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/progress.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/radio-group.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/resizable.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/scroll-area.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/separator.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/sidebar.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/skeleton.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/slider.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/table.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/toggle-group.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/toggle.jsx` | Remove | Unused UI primitive. |
| `src/components/ui/tooltip.jsx` | Remove | Unused UI primitive. |
| `src/config/businessConfig.js` | Replace | Replace with canonical, consumed business configuration before deleting this unused file. |
| `src/config/jobGroups.js` | Remove | Duplicates active lifecycle/status grouping. |
| `src/hooks/use-mobile.jsx` | Remove | Unused duplicate mobile hook. |
| `src/utils/index.ts` | Remove | Empty/unused barrel. |

## Explicit external-entry-point allowlist

These resources must not be removed by frontend dead-code tooling:

- `base44/functions/stripeWebhook`
- `base44/functions/processScheduledBlogPosts`
- `base44/functions/syncJobToGoogleCalendar`
- `base44/functions/syncGoogleCalendarToJobs`
- `base44/connectors/googlecalendar.jsonc`

The legacy assignment/linking functions are not allowlisted permanently. They are classified **Migrate, then remove** and must be checked against deployed entity automations before consolidation.

## Phase 1 deletion gate

Before a later phase removes any listed item, it must prove all of the following:

1. No static, dynamic, route, test, configuration, or documentation reference remains.
2. No Base44 entity automation, schedule, webhook, connector, or external provider calls it.
3. Its replacement is implemented and covered where the item represents real behavior.
4. Data written exclusively by it has been migrated or declared disposable with approval.
5. Lint, typecheck, tests, and build pass for the affected scope.
