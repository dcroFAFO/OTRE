# OTRE UI/UX Implementation Plan

Implement as seven ordered, independently verifiable increments from the latest `main`. Preserve existing React Query keys/data functions unless explicitly noted, use additive Base44 schema changes, and keep stale data visible during background refreshes.



##### Step 1: Shared States, Route Guards, And Quality Baseline

1. **Executive summary:** Establish accessible async-state primitives, reliable route protection, consistent notifications, and a passing engineering baseline before changing product flows.
2. **Missing loading states:** Replace custom spinners in `App`, `ProtectedRoute`, `DashboardLayout`, admin pages, and portal pages with labelled `PageLoader`; remove false-success `initialData`/`placeholderData` from jobs, staff, clients, and store queries where it currently renders zero or empty content before loading completes.
3. **Missing empty states:** Create one configurable `EmptyState` for genuine zero-data conditions and replace the page-local implementation in `Overview`.
4. **Missing error states:** Add `ErrorState` with safe default copy and optional `refetch`; preserve global read retries but stop retrying 401, 403, and 404 responses.
5. **Missing no-results states:** Add `NoResultsState` with a clear-search/filter action, distinct from first-use empty states.
6. **Missing unauthorized states:** Add `UnauthorizedState`; signed-out users redirect to `/login?next=...`, customers entering staff routes return to `/portal`, and insufficient staff permissions return to `/dashboard`.
7. **Reusable components created or updated:** Add `PageLoader`, `LoadingSpinner`, `CardSkeleton`, `TableSkeleton`, `EmptyState`, `ErrorState`, `NoResultsState`, `UnauthorizedState`, and `FieldShell`. Reuse existing `Button`, `Card`, `Alert`, `Skeleton`, `Sheet`, and Sonner toast. Do not create standalone `RetryButton`, `InlineSavingState`, or percentage upload progress.
8. **Fixes implemented:** Nest customer and staff routes under `ProtectedRoute`; place admin/settings/assets routes inside `DashboardLayout`; standardise notifications on Sonner; add safe error-message mapping; retain existing mutation invalidations; annotate shared UI props so `checkJs` remains enabled rather than suppressing type errors.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\App.jsx`, `O:\\OTRE\\OTRE\\src\\components\\ProtectedRoute.jsx`, `O:\\OTRE\\OTRE\\src\\components\\dashboard\\DashboardLayout.jsx`, `O:\\OTRE\\OTRE\\src\\components\\auth\\RequireCapability.jsx`, `O:\\OTRE\\OTRE\\src\\components\\UserNotRegisteredError.jsx`, `O:\\OTRE\\OTRE\\src\\hooks\\useJobs.js`, `O:\\OTRE\\OTRE\\src\\hooks\\useClients.js`, `O:\\OTRE\\OTRE\\src\\lib\\query-client.js`, new shared-state files under `O:\\OTRE\\OTRE\\src\\components\\shared\\`, plus `package.json`, `jsconfig.json`, and test configuration.
10. **Testing checklist:** Add Vitest, Testing Library, Playwright, and axe checks; test state-component ARIA semantics, retry behavior, signed-out return URLs, customer/staff role routing, stale-data refresh behavior, `npm run lint`, `npm run typecheck`, and `npm run build`.
11. **Remaining manual review items:** Confirm route behavior with real customer, technician, employee, and admin accounts in the Base44 test database.



##### Step 2: Canonical Job Lifecycle And Financial Semantics

1. **Executive summary:** Make one canonical lifecycle drive staff metrics, filters, badges, customer milestones, and invoice actions.
2. **Missing loading states:** Show metric/card skeletons in `Overview`, list/board skeletons in `Jobs`, and calendar skeletons until jobs resolve; never show temporary zero metrics.
3. **Missing empty states:** Distinguish “No jobs have been created” from “No scheduled jobs this week,” with `New Job` or booking actions where authorised.
4. **Missing error states:** Add retryable jobs/audit/calendar errors; partial audit or chart failure must not hide successfully loaded jobs.
5. **Missing no-results states:** Job search and filter misses show active-filter summaries and `Clear all filters`.
6. **Missing unauthorized states:** Job creation and financial controls remain hidden for roles lacking their existing capabilities; direct access uses the shared route/capability states.
7. **Reusable components created or updated:** Move category definitions and customer milestone selectors into `jobConfig`; update `StatusPill`, `MetricCard`, and shared async states rather than creating page-specific variants.
8. **Fixes implemented:** Normalise legacy statuses before all calculations; split waiting, ready, billing, completed, and cancelled categories; add an explicit Ready milestone; render Cancelled as a separate terminal state, never Complete; remove the Refund button and reject user-triggered `refunded` transitions while retaining historical display support; move manual paid/outstanding commands into a secondary menu with confirmation, pending guards, safe errors, and audit records.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\config\\jobConfig.js`, `O:\\OTRE\\OTRE\\base44\\shared\\jobLifecycle.ts`, `O:\\OTRE\\OTRE\\src\\pages\\dashboard\\Overview.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\dashboard\\Jobs.jsx`, `O:\\OTRE\\OTRE\\src\\components\\dashboard\\job\\JobCategoryFilters.jsx`, `O:\\OTRE\\OTRE\\src\\components\\portal\\CustomerJobModal.jsx`, `O:\\OTRE\\OTRE\\src\\components\\dashboard\\job\\InvoicePanel.jsx`, `O:\\OTRE\\OTRE\\src\\services\\paymentService.js`, and `O:\\OTRE\\OTRE\\base44\\functions\\invoiceActions\\entry.ts`.
10. **Testing checklist:** Table-test every canonical and legacy status; assert ready/cancelled milestones; verify metric counts and deep links; test empty/error/loading states; verify duplicate invoice actions are blocked and no Stripe refund is claimed or invoked.
11. **Remaining manual review items:** Confirm staff terminology for “On hold,” “Waiting on parts,” and manual payment recording; confirm historical refunded invoices remain understandable.

##### 

##### Step 3: Store, Cart, And Payment Continuity

1. **Executive summary:** Make checkout click-and-collect only, preserve cart state across Stripe, and show verified payment outcomes without exposing backend details.
2. **Missing loading states:** Add product card skeletons, checkout pending status, and a labelled payment-return verification state; keep controls disabled while checkout creation is pending.
3. **Missing empty states:** Provide separate catalogue-empty and cart-empty states with actions back to products.
4. **Missing error states:** Add retry for product reads and checkout-session verification; checkout creation remains manual-retry only and idempotent.
5. **Missing no-results states:** Search/category misses offer `Clear search`, `All products`, and mobile category recovery actions.
6. **Missing unauthorized states:** Store remains public; invoice checkout verifies that an authenticated customer owns the invoice or that staff is authorised, while public tracking continues using its signed token.
7. **Reusable components created or updated:** Add a reusable `PaymentResultAlert`; reuse `Sheet` for mobile categories/cart, `Alert` for return outcomes, and `FieldShell` for checkout fields.
8. **Fixes implemented:** Persist a versioned cart in local storage and reconcile it with current products; remove delivery/address/shipping copy and show workshop pickup details from BusinessProfile; add checkout attempt IDs and Stripe idempotency; create orders as `pending\_payment`; clear the cart only after server-verified success; preserve it on cancellation; include `session\_id` in store/invoice return URLs; preserve public tracking tokens; sanitise all 5xx responses.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\pages\\Store.jsx`, `O:\\OTRE\\OTRE\\src\\lib\\CartContext.jsx`, `O:\\OTRE\\OTRE\\src\\components\\store\\CartDrawer.jsx`, `O:\\OTRE\\OTRE\\src\\components\\store\\CheckoutDialog.jsx`, `O:\\OTRE\\OTRE\\src\\services\\paymentService.js`, `O:\\OTRE\\OTRE\\base44\\entities\\Order.jsonc`, `O:\\OTRE\\OTRE\\base44\\entities\\Invoice.jsonc`, `O:\\OTRE\\OTRE\\base44\\functions\\createStoreCheckout\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\createInvoiceCheckout\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\publicJobAccessActions\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\stripeWebhook\\entry.ts`, and a new checkout-status function.
10. **Testing checklist:** Verify reload persistence, server price authority, inactive-product reconciliation, duplicate-submit idempotency, cancellation retention, success-only clearing, zero/invalid totals, webhook races, public token preservation, mobile category access, and Stripe test-mode returns.
11. **Remaining manual review items:** Validate Stripe webhook/test secrets, workshop pickup instructions, browser Back behavior, and order handling after abandoned sessions.

##### 

##### Step 4: Referrals, Loyalty, And Verified Social Profiles

1. **Executive summary:** Replace unfinished promises with complete account-based rewards and public-profile verification workflows.
2. **Missing loading states:** Add reward-balance skeletons, invoice recalculation/reissue progress, referral-code validation, and social verification status.
3. **Missing empty states:** Explain no rewards, no referral activity, no completed-service progress, and no social profiles with appropriate next actions.
4. **Missing error states:** Use safe inline errors for invalid/expired/self-referral codes, ineligible invoices, expired rewards, invoice reissue failures, blocked profile verification, and rate limits.
5. **Missing no-results states:** Reward selection shows “No eligible reward for this invoice”; social profiles are not treated as a search surface.
6. **Missing unauthorized states:** Referral codes can only be claimed by authenticated accounts before their first booking; reward reads/actions are owner-scoped; staff access remains read-only unless explicitly authorised.
7. **Reusable components created or updated:** Add `MyRewardsCard`, `RewardPicker`, `RewardStatusBadge`, and `SocialProfilesCard`; replace the modal-based Connected Accounts editor with inline editing and verification.
8. **Fixes implemented:** Capture `?ref=` during registration only; issue the referred customer a $10 first-invoice reward for 90 days; after that first invoice settles, issue the referrer 10% off one later invoice capped at $50 for 90 days; issue 10% off labour capped at $50 for 180 days after each five distinct paid repairs settled after launch; allow one customer-selected reward per invoice; support removal until Stripe checkout starts; atomically apply, lock, redeem, expire, or release rewards and email a revised invoice; remove the prohibited 5% Google-review incentive while retaining a neutral review request under [Google’s review policy](https://support.google.com/business/answer/3474122?hl=en).
9. **Files changed:** New `O:\\OTRE\\OTRE\\base44\\entities\\CustomerReward.jsonc`, new reward function/shared lifecycle modules, `O:\\OTRE\\OTRE\\base44\\entities\\Customer.jsonc`, `O:\\OTRE\\OTRE\\base44\\entities\\SocialConnection.jsonc`, `O:\\OTRE\\OTRE\\base44\\entities\\Invoice.jsonc`, `O:\\OTRE\\OTRE\\base44\\functions\\customerSettings\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\claimCustomerJobs\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\invoicePdfActions\\entry.ts`, `O:\\OTRE\\OTRE\\base44\\functions\\sendNotification\\entry.ts`, `O:\\OTRE\\OTRE\\src\\pages\\Register.jsx`, portal invoice/reward components, `O:\\OTRE\\OTRE\\src\\pages\\About.jsx`, and `O:\\OTRE\\OTRE\\src\\pages\\Terms.jsx`.
10. **Testing checklist:** Test self/duplicate/late referral rejection, idempotent issuance, launch-date accrual, five-job milestones, expiry, one-per-invoice rules, labour-only calculation, $50 caps, apply/remove/checkout locking, cancelled invoice release, $0 settlement, webhook duplication, and social URL allowlists/rate limits.
11. **Remaining manual review items:** Obtain legal/accounting approval for reward terms and revised invoices; automatic verification is limited to allowlisted public social hosts, and blocked profiles remain visibly Unverified without OAuth or staff review.

##### 

##### Step 5: Public Navigation, Business Configuration, Booking, And Authentication

1. **Executive summary:** Make public navigation persistent, business details authoritative, and booking/account entry simpler and accessible.
2. **Missing loading states:** Add non-blocking BusinessProfile refresh feedback, pricing/blog skeletons, booking submit status, OTP/resend status, and visible profile-setup progress.
3. **Missing empty states:** Service pricing and blog pages explain genuinely unpublished content and retain booking/contact actions.
4. **Missing error states:** Add retryable BusinessProfile, pricing, and blog errors; booking and auth forms use safe inline errors, focus the first invalid field, and retain entered data.
5. **Missing no-results states:** Blog search/filter misses and service filters provide reset actions without presenting the whole catalogue as empty.
6. **Missing unauthorized states:** Public pages remain public; registration preserves safe `next` and referral parameters; protected destinations route through the Step 1 guards.
7. **Reusable components created or updated:** Add an inline `BusinessProfileCard` to settings; use `FieldShell`, existing form controls, `Collapsible` for alternative sign-in providers, `Sheet` for mobile public navigation, and official provider assets instead of inline drawings.
8. **Fixes implemented:** Make BusinessProfile authoritative with fallback `info@ontherunelectrics.com.au`, `0415 505 908`, `11 Lucinda Street, Woolloongabba QLD 4102`, 11am–midnight daily, and `Australia/Brisbane`; remove OTR Scooters/On The Road conflicts; show public navigation immediately without a hero ref; lead `/book` with guest booking, then sign-in/account paths; disclose SMS and email verification before registration; mark the scooter requirement in Profile Setup; associate all labels/errors; add a real manifest/icons from the existing brand asset; darken primary blue to an AA-compliant value and strengthen hero contrast.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\config\\platformConfig.js`, `O:\\OTRE\\OTRE\\src\\hooks\\usePlatformConfig.js`, `O:\\OTRE\\OTRE\\base44\\entities\\BusinessProfile.jsonc`, `O:\\OTRE\\OTRE\\src\\pages\\settings\\SystemSettings.jsx`, public landing/contact/footer components, `O:\\OTRE\\OTRE\\src\\components\\landing\\LandingNav.jsx`, `O:\\OTRE\\OTRE\\src\\components\\landing\\HeroCarousel.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\BookAccount.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\Register.jsx`, `O:\\OTRE\\OTRE\\src\\components\\booking\\PublicBookingForm.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\ProfileSetup.jsx`, `O:\\OTRE\\OTRE\\src\\lib\\PageNotFound.jsx`, `O:\\OTRE\\OTRE\\src\\lib\\structuredData.js`, `O:\\OTRE\\OTRE\\src\\index.css`, `O:\\OTRE\\OTRE\\index.html`, and new files under `O:\\OTRE\\OTRE\\public\\`.
10. **Testing checklist:** Test direct subpage navigation, mobile menu focus/Escape, dynamic contact data and fallback, referral-preserving auth redirects, all booking validation branches, duplicate submits, both OTP stages, 320/390/768/1440 widths, contrast, manifest assets, and public axe scans.
11. **Remaining manual review items:** Confirm BusinessProfile production values, ABN and invoice sender identity, official provider icon licensing, and every hero slide’s text contrast against its real photograph.

## 

##### Step 6: Customer Portal, Public Tracking, And Signatures

1. **Executive summary:** Clarify portal information architecture, replace disruptive onboarding, and make tracking/signature actions recoverable and accessible.
2. **Missing loading states:** Add independent settings/jobs/invoices/rewards/history/signature skeletons so one slow query does not block the whole portal; show indeterminate “Uploading…” because Base44 exposes no byte progress.
3. **Missing empty states:** Add actionable states for no scooters, jobs, invoices, messages, files, signatures, or rewards.
4. **Missing error states:** Add partial-page retries for portal queries; wrap tracking note/upload/payment and signature operations in guarded `try/catch/finally`; never leave controls permanently busy.
5. **Missing no-results states:** History/search filters, where present, show resettable no-results states without replacing genuine empty states.
6. **Missing unauthorized states:** Customer routes use shared auth guards; staff accounts receive a clear dashboard action; invalid/expired tracking links reveal no record details and offer canonical contact options.
7. **Reusable components created or updated:** Reuse `CustomerInvoiceCard` across portal surfaces; add an inline `GettingStartedPanel`; update `SignatureCapture` with Draw/Type segmented modes and consent fields.
8. **Fixes implemented:** Keep jobs, invoices, rewards, booking, and support on My Account; move account details, scooters, and social profiles exclusively to Settings; replace the auto-opening tutorial overlays with a dismissible/resumable checklist; correct milestones through canonical selectors; make tracking tables stack on mobile; preserve payment query/token state; add typed-name signature fallback, accessible canvas instructions, save guards, metadata, and retry.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\pages\\PortalAccount.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\PortalSettings.jsx`, portal account/settings components, `O:\\OTRE\\OTRE\\src\\components\\portal\\tutorial\\PortalTutorial.jsx`, `O:\\OTRE\\OTRE\\src\\components\\portal\\CustomerJobModal.jsx`, `O:\\OTRE\\OTRE\\src\\components\\portal\\SignatureCapture.jsx`, `O:\\OTRE\\OTRE\\src\\pages\\PublicTrack.jsx`, `O:\\OTRE\\OTRE\\base44\\entities\\Attachment.jsonc`, and `O:\\OTRE\\OTRE\\base44\\functions\\publicJobAccessActions\\entry.ts`.
10. **Testing checklist:** Test independent partial failures, empty portal data, tutorial persistence, staff/customer routing, invalid tracking tokens, note/upload retry, file constraints, payment returns, every milestone, pointer and typed signatures, duplicate save prevention, keyboard-only use, and mobile line-item layout.
11. **Remaining manual review items:** Obtain legal approval for typed signatures and consent wording; exercise real tracking links, uploads, emails, and Stripe returns against the Base44 test environment.

## 

##### Step 7: Staff Operations, Admin, Blog, Mobile, And Release Verification

1. **Executive summary:** Complete state coverage and responsive/accessibility remediation across staff, admin, pricing, and publishing surfaces, then run full release gates.
2. **Missing loading states:** Apply `CardSkeleton`/`TableSkeleton` to Overview, Jobs, Calendar, Invoices, Parts, Asset Management, revenue charts, customer history/pickers, admin clients/feedback/activity, public blog, and every blog-admin query.
3. **Missing empty states:** Provide task-specific first-use actions for jobs, parts, invoices, customers, feedback, activity, pricing categories/items, blog posts, taxonomy, logs, comments, and chart datasets.
4. **Missing error states:** Add retryable read errors and safe mutation feedback throughout; retain successful sections during partial failures; disable every save/publish/archive/upload/bulk action while pending.
5. **Missing no-results states:** Every search/filter surface reports the active query and supplies a clear/reset action, especially Jobs, Parts, Invoices, Clients, Feedback, Activity, Store, and Blog.
6. **Missing unauthorized states:** Keep staff navigation role-aware; hide admin-only pricing, feedback, activity, and publishing commands; enforce matching backend role checks.
7. **Reusable components created or updated:** Reuse the shared state/field components; add only a mobile `ClientCard`, accessible chart data table, and inline `ServiceItemEditor`; update `Button` with explicit touch-size variants instead of enlarging dense desktop controls globally.
8. **Fixes implemented:** Make sidebar groups collapsible and descendant-active; replace the custom mobile drawer with `Sheet`; add `/settings/service-pricing` as an admin editor using existing pricing components; default Calendar to day view on mobile and synchronise selected dates; add mobile client summaries; convert clickable rows/pickers to native controls; collapse staff form grids below `sm`; fix Blog Editor pending/validation/publish states and Taxonomy edit mode; add skip links, main landmarks, 44px mobile targets, associated labels, live regions, chart tables, and consistent visual hierarchy.
9. **Files changed:** `O:\\OTRE\\OTRE\\src\\components\\dashboard\\DashboardShell.jsx`, dashboard pages/components, `O:\\OTRE\\OTRE\\src\\pages\\admin\\\*.jsx`, `O:\\OTRE\\OTRE\\src\\components\\admin\\`, new `O:\\OTRE\\OTRE\\src\\pages\\settings\\ServicePricingAdmin.jsx`, `O:\\OTRE\\OTRE\\src\\components\\pricing\\`, `O:\\OTRE\\OTRE\\src\\pages\\blog-admin\\`, `O:\\OTRE\\OTRE\\src\\pages\\blog\\`, `O:\\OTRE\\OTRE\\src\\components\\blog\\`, and the form files identified by the label scan under dashboard, assets, booking, feedback, portal, settings, and store components.
10. **Testing checklist:** Require clean lint/typecheck/build/unit suites; run mocked Playwright journeys for booking, registration, store cancel/success, rewards, portal, tracking, staff jobs, calendar, clients, pricing, and blog publishing; run axe and screenshot comparisons at 390x844, 768x1024, and 1440x900; run an opt-in staging suite with Base44 test accounts and Stripe test mode.
11. **Remaining manual review items:** Verify NVDA/VoiceOver behavior, Safari touch/signature behavior, real chart values, long customer/product names, destructive confirmations, Base44 entity migrations, notification delivery, and production monitoring before merging each increment into `main`.

