import BreadCrumb from "../components/shop/BreadCrumb";

export default function ShippingReturnsPage() {
  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Shipping & Returns" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-border bg-white/90 p-8 sm:p-12 shadow-sm">
          <header className="text-center">
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
              Shipping &amp; Returns
            </h1>
            <p className="mt-3 text-secondary">
              Transparent delivery times, EU-compliant returns and stress-free exchanges.
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <article className="lg:col-span-7 space-y-8">
              <Section
                title="Shipping destinations & carriers"
                paragraphs={[
                  "We dispatch orders from Berlin, Germany to all EU member states, the United Kingdom, Switzerland and Norway. Parcels are shipped with DHL GoGreen, DPD or GLS depending on destination.",
                ]}
                list={{
                  heading: "Estimated transit times:",
                  items: [
                    "Germany, Austria, Benelux: 2–3 business days",
                    "Rest of EU & UK: 3–5 business days",
                    "Switzerland & Norway: 4–6 business days (customs clearance included)",
                  ],
                }}
              />

              <Section
                title="Shipping rates"
                paragraphs={[
                  "Orders above €150 ship free within the EU. Below this threshold we charge a flat €6.90 in Germany and €9.90 in the rest of the EU/UK. Switzerland and Norway shipments incur €14.90 to cover customs brokerage.",
                ]}
              />

              <Section
                title="Order processing"
                paragraphs={[
                  "Orders placed before 14:00 CET ship the same working day. During high season (November–December) processing can extend to 48 hours. Once handed to the carrier you receive a tracking e-mail.",
                ]}
              />

              <Section
                title="Return policy"
                paragraphs={[
                  "You have the right to withdraw from your purchase within 30 days of delivery, in line with Directive 2011/83/EU. Items must be unworn, with tags attached and hygiene seals intact.",
                ]}
                list={{
                  heading: "Return instructions:",
                  items: [
                    "Initiate your return via support@evimstil.com and include your order number.",
                    "We provide a prepaid label for EU addresses. Outside the EU you may choose your own insured service.",
                    "Pack items securely in their original packaging. Partial set returns are not accepted.",
                    "Drop the parcel at the designated carrier within 14 days of label issuance.",
                  ],
                }}
              />

              <Section
                title="Refunds & exchanges"
                paragraphs={[
                  "We inspect returns within 5 business days of receipt. Refunds are issued to the original payment method immediately after inspection; banks may require up to 3 business days to post funds.",
                  "Exchanges are treated as new shipments: select the requested size or style and we reserve it for ten days. Once the return is scanned by the carrier we dispatch the exchange free of charge.",
                ]}
              />

              <Section
                title="Damaged or incorrect items"
                paragraphs={[
                  "If your order arrives damaged or incomplete, contact us within 48 hours. Include photos of the parcel, labels and product. We will arrange a replacement or issue a full refund including shipping costs.",
                ]}
              />
            </article>

            <aside className="lg:col-span-5">
              <div className="space-y-6 rounded-2xl border border-border bg-contact-bg/80 p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  Quick facts
                </h2>
                <ul className="space-y-4 text-sm text-secondary">
                  <li>• All orders ship with climate-compensated services.</li>
                  <li>• Prices include VAT for EU consumers. Non-EU customers may be charged duties.</li>
                  <li>• You receive automated tracking updates and delivery estimates.</li>
                  <li>• Returns from EU countries are free; other destinations cover outbound shipping only.</li>
                  <li>• Refunds appear under “Evim &amp; Stil Berlin” on your bank statement.</li>
                </ul>
                <div className="rounded-2xl border border-border/70 bg-white p-5 text-sm text-secondary">
                  Need assistance? Reach us at{" "}
                  <a href="mailto:returns@evimstil.com" className="text-accent underline">
                    returns@evimstil.com
                  </a>{" "}
                  or call +49 (0)30 234 567 89. Our returns team is available Monday to Friday, 09:00–17:00 CET.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({ title, paragraphs, list }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-primary">{title}</h2>
      {paragraphs.map((text) => (
        <p key={text} className="mt-3 text-secondary">
          {text}
        </p>
      ))}
      {list ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-light p-4 text-sm text-secondary">
          <p className="font-medium text-primary">{list.heading}</p>
          <ul className="mt-2 space-y-2">
            {list.items.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
