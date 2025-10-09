import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import BreadCrumb from "../components/shop/BreadCrumb";

const FAQ_SECTIONS = [
  {
    title: "Ordering & Payments",
    items: [
      {
        question: "Which payment methods do you accept?",
        answer:
          "We accept major credit and debit cards (Visa, Mastercard, Maestro), PayPal, Apple Pay and Sofort. All payments are processed securely in EUR and comply with the EU’s PSD2 strong customer authentication requirements.",
      },
      {
        question: "Can I modify or cancel my order?",
        answer:
          "If you need to change or cancel an order, contact us within two hours of placing it. After the order enters preparation we may no longer be able to make adjustments, but we will try to find a suitable solution together.",
      },
    ],
  },
  {
    title: "Shipping",
    items: [
      {
        question: "Which countries do you ship to?",
        answer:
          "We ship to all EU member states, the United Kingdom, Switzerland and Norway. Orders are dispatched from Berlin, Germany. View transit times and pricing on our Shipping & Returns page.",
      },
      {
        question: "Will I receive tracking information?",
        answer:
          "Yes. Once your parcel leaves our warehouse you receive a tracking e-mail with live updates. If you do not see the message, please check your spam folder or contact us.",
      },
    ],
  },
  {
    title: "Returns & Exchanges",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "You can return unworn items within 30 days of delivery under the EU consumer rights directive. Please ensure original tags remain attached and hygiene seals are intact. Sets must be returned in full.",
      },
      {
        question: "How long do refunds take?",
        answer:
          "Refunds are processed within 5 working days after we receive and inspect your return. Funds are credited via the original payment method. We will e-mail you once the refund has been issued.",
      },
    ],
  },
  {
    title: "Products & Care",
    items: [
      {
        question: "How should I care for delicate lingerie?",
        answer:
          "Hand wash in cool water with a mild detergent, rinse thoroughly and air dry flat. If using a machine, select a delicate programme, place items in a mesh bag and avoid tumble drying.",
      },
      {
        question: "Do you offer custom bridal consultations?",
        answer:
          "Yes. Book an appointment at our Berlin studio or request a virtual consultation via our Contact page. We will curate trousseau sets tailored to your theme, size and budget.",
      },
    ],
  },
];

export default function FAQPage() {
  const sections = useMemo(() => FAQ_SECTIONS, []);
  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "FAQ" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-border bg-white/90 p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <HelpCircle className="h-6 w-6" />
            </span>
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 max-w-3xl text-secondary">
              Find quick answers about orders, shipping, returns and product care. Need more help?
              Reach us anytime via{" "}
              <a href="/contact" className="text-accent underline">
                our contact page
              </a>
              .
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <FAQSection key={section.title} section={section} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FAQSection({ section }) {
  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold text-primary">
        {section.title}
      </h2>
      <div className="mt-4 divide-y divide-border/70 rounded-2xl border border-border bg-surface-light">
        {section.items.map((item) => (
          <FAQItem key={item.question} item={item} />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-primary transition hover:bg-white"
        aria-expanded={open}
      >
        <span className="font-medium">{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${open ? "rotate-180 text-accent" : "text-secondary"}`}
        />
      </button>
      {open ? (
        <div className="px-4 pb-5 text-sm text-secondary sm:px-6">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
}
