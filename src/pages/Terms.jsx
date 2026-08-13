import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import SEO from "@/components/SEO";
import LandingFooter from "@/components/landing/LandingFooter";
import LegalSection from "@/components/legal/LegalSection";
import { businessContactLinks } from "@/config/platformConfig";
import { getTermsPageSchema } from "@/lib/structuredData";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

const LAST_UPDATED = "13 August 2026";

const SECTIONS = [
  ["privacy", "Privacy Policy"],
  ["collection", "What we collect & why"],
  ["cookies", "Cookies, analytics & advertising"],
  ["google", "Google services & limited use"],
  ["payments", "Payments & Stripe"],
  ["rewards", "Referral & loyalty rewards"],
  ["communications", "Email & SMS communications"],
  ["rights", "Your data rights, retention & security"],
  ["service", "Terms of Service (repairs & bookings)"],
  ["use", "Terms of Use (website & portal)"],
  ["ip", "Intellectual property"],
  ["liability", "Disclaimers & limitation of liability"],
  ["law", "Governing law & changes"],
  ["contact", "How to contact us"],
];

export default function Terms() {
  const { data: { business } } = usePlatformConfig();
  const links = businessContactLinks(business);
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms & Conditions, Privacy Policy | On The Run Electrics"
        description="Privacy policy, terms of service, terms of use, cookie and data handling statements for On The Run Electrics electric scooter repairs."
        canonical="/terms"
        structuredData={getTermsPageSchema(business)}
      />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15">
            <ScrollText className="h-5 w-5 text-accent" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">T&apos;s &amp; C&apos;s</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Privacy, terms of service, terms of use and data handling for {business.name}. Last updated {LAST_UPDATED}.
            </p>
          </div>
        </div>

        <nav className="mt-8 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">On this page</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`} className="flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-accent">
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-8">
          <LegalSection id="privacy" title="1. Privacy Policy">
            <p>
              {business.name} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this website and customer portal for electric scooter
              repairs, servicing and parts. We handle personal information in accordance with the Australian Privacy Act 1988 (Cth) and the
              Australian Privacy Principles (APPs), and — where it applies to visitors in the EU/UK — the GDPR.
            </p>
            <p>
              By using this site, booking a repair, creating an account or contacting us, you consent to the collection, use and disclosure of your
              information as described in this policy.
            </p>
          </LegalSection>

          <LegalSection id="collection" title="2. What we collect & why">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Contact details</strong> — name, email, phone number and address, so we can identify you, confirm bookings and provide updates.</li>
              <li><strong>Booking &amp; repair information</strong> — scooter make, model, serial number, fault descriptions, photos, notes, quotes, invoices and service history.</li>
              <li><strong>Account information</strong> — login identifiers and, if you sign in with Google, your Google account name, email and profile photo.</li>
              <li><strong>Payment information</strong> — processed by our payment provider; we do not store your full card details.</li>
              <li><strong>Technical &amp; usage data</strong> — IP address, browser and device type, pages viewed and referring links, used for security, troubleshooting and improving the site.</li>
            </ul>
            <p>
              We collect this information to provide and manage repair services, to communicate with you, to meet our legal, tax and warranty
              obligations, and to improve our services. We do not sell your personal information.
            </p>
            <p>
              We share information only with service providers who help us run the business (hosting and app platform, email and SMS delivery,
              payment processing, cloud spreadsheets and calendars, parts suppliers where a part must be ordered for your repair), and where required
              or permitted by law. Some of these providers may store data overseas.
            </p>
          </LegalSection>

          <LegalSection id="cookies" title="3. Cookies, analytics & advertising">
            <p>
              We use cookies and similar technologies that are necessary for the site to function (for example keeping you signed in), plus
              analytics and advertising cookies. We use <strong>Google Analytics</strong> and <strong>Google Ads</strong> conversion tracking to
              understand how visitors find and use the site and to measure our advertising.
            </p>
            <p>
              These tools may set cookies and collect device and usage identifiers. You can control cookies through your browser settings, opt out of
              Google Analytics using Google&apos;s browser add-on, and manage ad personalisation in your Google account settings. Blocking some cookies
              may affect how parts of the site work.
            </p>
          </LegalSection>

          <LegalSection id="google" title="4. Google services & limited use">
            <p>
              Our site and portal use Google services including Google Sign-In, Google Maps, Google Calendar, Google Sheets and Google APIs. Your use
              of those features is also subject to Google&apos;s Terms of Service and Privacy Policy.
            </p>
            <p>
              Where we access data from Google APIs, that use is limited to providing and improving the features you have asked for — such as
              scheduling your booking, mapping our location, or maintaining our internal customer records. We do not transfer Google user data to
              third parties except as necessary to provide those features, comply with the law, or as part of a merger or acquisition; we do not use
              it for advertising; and we do not allow humans to read it unless you ask us to, we need to for security or legal reasons, or the data is
              aggregated and de-identified.
            </p>
          </LegalSection>

          <LegalSection id="payments" title="5. Payments & Stripe">
            <p>
              Online payments for quotes, invoices and store orders are processed by Stripe. Card details are entered on Stripe&apos;s secure systems and
              are handled under Stripe&apos;s privacy policy and terms. We receive only a payment confirmation, the amount, and limited reference details.
            </p>
            <p>
              Prices are in Australian dollars and are payable before collection of your scooter unless we agree otherwise in writing. Refunds are
              handled in line with the Australian Consumer Law and your consumer guarantees.
            </p>
          </LegalSection>

          <LegalSection id="rewards" title="6. Referral & loyalty rewards">
            <ul className="list-disc space-y-1 pl-5">
              <li>A new customer may claim one valid referral code during account registration and before making their first booking.</li>
              <li>The referred customer receives $10 off their first eligible invoice for 90 days. After that invoice is paid, the referrer receives 10% off one later invoice, capped at $50 and valid for 90 days.</li>
              <li>Every five distinct repairs paid after the loyalty program launch earns 10% off labour on one invoice, capped at $50 and valid for 180 days.</li>
              <li>Only one reward may be applied to an invoice. A reward can be removed until Stripe checkout begins and is redeemed only when the invoice settles.</li>
              <li>Rewards are account-specific, have no cash value, cannot be transferred, and may be cancelled where issued through error, abuse, fraud or an invalid transaction.</li>
            </ul>
            <p>Public reviews are optional and are never required to receive a reward.</p>
          </LegalSection>

          <LegalSection id="communications" title="7. Email & SMS communications">
            <p>
              When you book a repair or create an account, you agree to receive service-related emails and SMS messages — booking confirmations,
              status updates, quotes, invoices, collection notices and reminders. These are necessary to deliver the service you requested.
            </p>
            <p>
              Any marketing or promotional messages are optional and will always include an unsubscribe or opt-out method, as required by the Spam Act
              2003 (Cth). Standard carrier charges may apply to messages you send us.
            </p>
          </LegalSection>

          <LegalSection id="rights" title="8. Your data rights, retention & security">
            <ul className="list-disc space-y-1 pl-5">
              <li>You may request access to, or correction of, the personal information we hold about you.</li>
              <li>You may request deletion of your account and personal information, subject to records we must keep for tax, warranty or legal reasons.</li>
              <li>You may withdraw consent for optional marketing at any time.</li>
              <li>Where the GDPR applies, you also have rights to data portability, restriction of processing and objection, and may lodge a complaint with your supervisory authority.</li>
            </ul>
            <p>
              We keep repair, quote and invoice records for as long as required by Australian law (generally at least 7 years) and delete or
              de-identify other information when it is no longer needed. We use access controls, encryption in transit and reputable service
              providers to protect your data, but no online system can be guaranteed completely secure.
            </p>
            <p>
              To exercise any of these rights, email <a className="font-medium text-accent underline" href={links.email}>{business.email}</a>. If
              you are unhappy with our response, you may complain to the Office of the Australian Information Commissioner (oaic.gov.au).
            </p>
          </LegalSection>

          <LegalSection id="service" title="9. Terms of Service (repairs & bookings)">
            <ul className="list-disc space-y-1 pl-5">
              <li>Bookings are requests only and are confirmed once we contact you. Times are estimates and may change based on workload and parts availability.</li>
              <li>Quotes are estimates based on the reported fault. If additional faults are found, we will contact you for approval before extra work is carried out.</li>
              <li>Diagnostic and inspection fees may apply where a repair is declined after assessment.</li>
              <li>We are not the manufacturer. Repairs may affect a manufacturer&apos;s warranty; it is your responsibility to check your warranty terms.</li>
              <li>Our workmanship is guaranteed for the period stated on your invoice. Parts carry the supplier&apos;s warranty. Consumables and wear items (tyres, brake pads, tubes) are excluded.</li>
              <li>You must have the legal right to have the scooter serviced. We may refuse work on unsafe, illegally modified or suspected stolen equipment.</li>
              <li>Scooters must be collected within 30 days of being marked ready. Storage fees may apply after that period, and uncollected goods may be disposed of in accordance with applicable law.</li>
              <li>Nothing in these terms excludes, restricts or modifies your rights under the Australian Consumer Law.</li>
            </ul>
          </LegalSection>

          <LegalSection id="use" title="10. Terms of Use (website & portal)">
            <ul className="list-disc space-y-1 pl-5">
              <li>You must provide accurate information and keep your account credentials secure. You are responsible for activity under your account.</li>
              <li>You must be at least 16 years old, or have a parent or guardian&apos;s consent, to create an account.</li>
              <li>You must not attempt to gain unauthorised access to the site, other customers&apos; records, or our systems, nor scrape, overload or interfere with the service.</li>
              <li>You must not upload unlawful, offensive or infringing content, or content containing malware.</li>
              <li>We may suspend or terminate accounts that breach these terms, and may modify or discontinue features at any time.</li>
              <li>AI-assisted features (such as our repair assistant) provide general guidance only and are not a substitute for a professional inspection.</li>
            </ul>
          </LegalSection>

          <LegalSection id="ip" title="11. Intellectual property">
            <p>
              All content on this site — text, branding, layout, graphics, articles and code — is owned by {business.name} or its
              licensors and is protected by copyright and trade mark law. You may view and print pages for your own personal use, but may not
              reproduce, republish or commercially exploit our content without written permission.
            </p>
          </LegalSection>

          <LegalSection id="liability" title="12. Disclaimers & limitation of liability">
            <p>
              Information on this site, including pricing guides and blog articles, is general in nature and provided without warranty of accuracy or
              completeness. The site is provided on an &quot;as is&quot; and &quot;as available&quot; basis; we do not warrant uninterrupted or error-free operation.
            </p>
            <p>
              To the maximum extent permitted by law, and except for rights that cannot be excluded under the Australian Consumer Law, our liability
              for any claim arising from the site or our services is limited to re-supplying the service or refunding the amount you paid for it. We
              are not liable for indirect or consequential loss, including loss of use, profit or data. Third-party sites we link to are not under our
              control and we are not responsible for their content.
            </p>
          </LegalSection>

          <LegalSection id="law" title="13. Governing law & changes to these terms">
            <p>
              These terms are governed by the laws of Queensland, Australia, and you submit to the non-exclusive jurisdiction of its courts. We may
              update these terms from time to time; the current version is always published on this page with its last-updated date. Continued use of
              the site after changes are published means you accept the updated terms.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="14. How to contact us">
            <p>
              For any privacy request, complaint or question about these terms:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>{business.name}</strong></li>
              <li>Email: <a className="font-medium text-accent underline" href={links.email}>{business.email}</a></li>
              <li>Phone: <a className="font-medium text-accent underline" href={links.phone}>{business.phone}</a></li>
              <li>Address: {business.address}</li>
            </ul>
          </LegalSection>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
