import BreadCrumb from "../components/shop/BreadCrumb";

const SECTIONS = [
  {
    id: "controller",
    title: "1. Data controller",
    content: [
      "Evim & Stil GmbH, Kurfürstendamm 45, 10719 Berlin, Germany, acts as the controller for personal data processed when you interact with this website, place orders or communicate with us.",
      "You can reach our Data Protection Officer at privacy@evimstil.com or by post at the address above (please include “Attn: Data Protection”).",
    ],
  },
  {
    id: "data-processed",
    title: "2. Personal data we process",
    content: [
      "We collect identification and contact data (name, postal address, email, phone), transactional data (orders, payments, delivery preferences), communication content (messages, support requests) and technical usage data (IP address, device information, cookies).",
      "We do not store full payment card numbers. Payments are processed via PSD2-compliant providers that act as separate controllers.",
    ],
  },
  {
    id: "purposes",
    title: "3. Purposes & legal bases",
    content: [
      "Contract performance (Art. 6(1)(b) GDPR): processing orders, payments, deliveries and customer service.",
      "Legal obligations (Art. 6(1)(c) GDPR): maintaining accounting records, complying with VAT and consumer protection laws.",
      "Legitimate interests (Art. 6(1)(f) GDPR): preventing fraud, improving our services, ensuring website security.",
      "Consent (Art. 6(1)(a) GDPR): sending newsletters or promotional emails when you opt in.",
    ],
  },
  {
    id: "retention",
    title: "4. Retention periods",
    content: [
      "Order-related data is retained for 10 years to comply with German commercial and tax regulations.",
      "Customer service communications are stored for 24 months after resolution.",
      "Marketing consent is retained until you withdraw it; unsubscribing removes you from mailing lists immediately.",
      "Technical logs are anonymised or deleted within 30 days unless needed for security investigations.",
    ],
  },
  {
    id: "recipients",
    title: "5. Data recipients & international transfers",
    content: [
      "We share data with logistics partners (DHL, DPD, GLS), payment processors (Stripe, PayPal), IT service providers and professional advisors when necessary.",
      "If data is transferred outside the European Economic Area, we ensure appropriate safeguards such as EU Standard Contractual Clauses or adequacy decisions.",
    ],
  },
  {
    id: "rights",
    title: "6. Your rights under GDPR",
    content: [
      "You have the right to access, rectify, erase or port your data, to restrict or object to processing and to withdraw consent at any time.",
      "To exercise your rights, contact privacy@evimstil.com. We will respond within one month.",
      "You also have the right to lodge a complaint with your local supervisory authority (e.g. Berliner Beauftragte für Datenschutz und Informationsfreiheit).",
    ],
  },
  {
    id: "cookies",
    title: "7. Cookies & analytics",
    content: [
      "We use strictly necessary cookies for site functionality and analytics cookies (Matomo) to understand usage. Non-essential cookies are activated only after you opt in via the banner.",
      "You may change your cookie preferences at any time via the link in the footer.",
    ],
  },
  {
    id: "updates",
    title: "8. Updates",
    content: [
      "We may update this privacy policy to reflect legal or operational changes. The latest version is always available on this page. Significant changes will be communicated via email or on-site notice.",
      "Last updated: 8 October 2025.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Privacy Policy" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-border bg-white/90 p-8 sm:p-12 shadow-sm">
          <header className="text-center">
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
              Privacy Policy
            </h1>
            <p className="mt-3 text-secondary">
              Your privacy matters. This policy explains how we process personal data in compliance with the EU General Data Protection Regulation (GDPR).
            </p>
          </header>

          <nav className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-2xl border border-border bg-surface-light px-4 py-3 text-primary transition hover:border-accent hover:bg-white"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <div className="mt-10 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  {section.title}
                </h2>
                {section.content.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-secondary">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <footer className="mt-12 rounded-2xl border border-border bg-contact-bg/70 p-6 text-sm text-secondary">
            If you have questions about this policy or wish to exercise your data protection rights, e-mail us at{" "}
            <a href="mailto:privacy@evimstil.com" className="text-accent underline">
              privacy@evimstil.com
            </a>{" "}
            or write to Evim &amp; Stil GmbH, Kurfürstendamm 45, 10719 Berlin, Germany.
          </footer>
        </div>
      </section>
    </main>
  );
}
