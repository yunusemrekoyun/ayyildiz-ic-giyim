import BreadCrumb from "../components/shop/BreadCrumb";

const SECTIONS = [
  {
    title: "1. Scope and contract formation",
    paragraphs: [
      "These Terms of Service govern purchases made on evimstil.com operated by Evim & Stil GmbH, Kurfürstendamm 45, 10719 Berlin, Germany.",
      "By placing an order you confirm that you are at least 18 years old and legally capable of entering into binding contracts. A contract is concluded when we accept your order and send the dispatch confirmation email.",
    ],
  },
  {
    title: "2. Product information",
    paragraphs: [
      "We make every effort to display colours and finishes accurately; minor variations may occur depending on your screen.",
      "All textiles comply with EU safety standards. Care instructions accompany each product and should be followed to maintain warranty coverage.",
    ],
  },
  {
    title: "3. Pricing & payment",
    paragraphs: [
      "All prices are in EUR and include the applicable VAT for shipments within the European Union. Shipments to non-EU countries may be subject to duties and taxes payable by the recipient.",
      "We accept Visa, Mastercard, Maestro, PayPal, Apple Pay and Sofort. Payments are processed securely through PSD2-compliant providers.",
    ],
  },
  {
    title: "4. Shipping",
    paragraphs: [
      "Delivery options, times and costs are set out on our Shipping & Returns page. Delivery times are estimates and exclude circumstances outside our control.",
      "If an item becomes unavailable after you place an order, we will inform you promptly and refund any amounts paid.",
    ],
  },
  {
    title: "5. Right of withdrawal & returns",
    paragraphs: [
      "EU consumers have a statutory right to withdraw from the contract within 14 days. We extend this right to 30 days provided products are unworn, with tags and hygiene seals intact.",
      "To exercise your right of withdrawal, notify us via e-mail within the withdrawal period. Further details, including our model withdrawal form, are available on the Shipping & Returns page.",
    ],
  },
  {
    title: "6. Warranty & liability",
    paragraphs: [
      "Your statutory warranty rights apply for two years from delivery. If you receive a defective product, contact us immediately with photos and order details.",
      "We are liable without limitation for intent and gross negligence, for injury to life, body or health, and under the German Product Liability Act. In cases of slight negligence, we are liable only for breaches of material contractual obligations (cardinal duties) and limited to foreseeable damages.",
    ],
  },
  {
    title: "7. Customer accounts",
    paragraphs: [
      "You are responsible for keeping your login credentials confidential. Notify us immediately if you suspect unauthorised use of your account.",
      "We may suspend or close accounts that violate these terms or applicable law.",
    ],
  },
  {
    title: "8. Governing law & dispute resolution",
    paragraphs: [
      "Contracts are governed by German law. Mandatory consumer protection rules of your residence country remain unaffected.",
      "The European Commission provides an Online Dispute Resolution platform at https://ec.europa.eu/consumers/odr/. We are neither obliged nor willing to participate in alternative dispute resolution proceedings before a consumer arbitration board.",
    ],
  },
  {
    title: "9. Contact",
    paragraphs: [
      "Evim & Stil GmbH, Kurfürstendamm 45, 10719 Berlin, Germany",
      "Email: legal@evimstil.com | Phone: +49 (0)30 234 567 89",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Terms of Service" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-border bg-white/90 p-8 sm:p-12 shadow-sm">
          <header className="text-center">
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
              Terms of Service
            </h1>
            <p className="mt-3 text-secondary">
              Please read these terms carefully before placing an order. They outline your rights and obligations when shopping with Evim &amp; Stil.
            </p>
          </header>

          <div className="mt-10 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  {section.title}
                </h2>
                {section.paragraphs.map((text) => (
                  <p key={text} className="mt-3 text-secondary">
                    {text}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <footer className="mt-10 rounded-2xl border border-border bg-contact-bg/70 p-6 text-sm text-secondary">
            Last updated: 8 October 2025. We may revise these terms from time to time. The version displayed here is always the most current.
          </footer>
        </div>
      </section>
    </main>
  );
}
