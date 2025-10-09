import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import BreadCrumb from "../components/shop/BreadCrumb";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Contact" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-white/90 shadow-sm">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
            <div className="lg:col-span-7 p-8 sm:p-10">
              <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
                We&apos;re here to help
              </h1>
              <p className="mt-3 text-secondary">
                Our customer care team is available Monday to Friday, 09:00–18:00 CET.
                Send us a note and we&apos;ll respond within one business day.
              </p>

              {submitted ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                  Thank you for your message. We have received your enquiry and will reply
                  via e-mail shortly. If you need immediate assistance, call us on the number below.
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label="Full name"
                    id="contact-name"
                    required
                    placeholder="Jane Doe"
                  />
                  <TextField
                    label="Email"
                    id="contact-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <TextField
                  label="Phone (optional)"
                  id="contact-phone"
                  type="tel"
                  placeholder="+49 170 123 4567"
                />
                <TextField
                  label="Subject"
                  id="contact-subject"
                  required
                  placeholder="How can we support you?"
                />
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-semibold text-primary"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    placeholder="Tell us a little more about your question, order or project."
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
              </form>

              <p className="mt-6 text-xs text-secondary">
                By submitting this form you acknowledge that we will process your data to
                answer your enquiry in line with our{" "}
                <a href="/privacy" className="text-accent underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <aside className="lg:col-span-5 border-t border-border/70 bg-contact-bg/70 lg:border-l lg:border-t-0">
              <div className="space-y-8 p-8 sm:p-10">
                <ContactBlock
                  icon={MapPin}
                  title="Visit our European studio"
                  items={[
                    "Kurfürstendamm 45, 10719 Berlin",
                    "Showroom & click-and-collect (appointment recommended)",
                  ]}
                />
                <ContactBlock
                  icon={Clock}
                  title="Opening hours (CET)"
                  items={[
                    "Mon – Fri: 09:00 – 18:00",
                    "Sat: 10:00 – 16:00 (showroom only)",
                    "Sun & public holidays: closed",
                  ]}
                />
                <ContactBlock
                  icon={Mail}
                  title="Customer service"
                  items={[
                    "support@evimstil.com",
                    "Average response time: < 24 h",
                  ]}
                />
                <ContactBlock
                  icon={Phone}
                  title="Phone"
                  items={[
                    "+49 (0) 30 234 567 89",
                    "WhatsApp & Signal available on the same number",
                  ]}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function TextField({ label, id, type = "text", required = false, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-primary">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}

function ContactBlock({ icon: Icon, title, items }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-primary">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-1 text-sm text-secondary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
