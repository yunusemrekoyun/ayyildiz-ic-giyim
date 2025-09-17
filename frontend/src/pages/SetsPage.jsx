// src/pages/SetsPage.jsx
import BreadCrumb from "../components/shop/BreadCrumb";
import SetsSets from "../components/sets-sets/SetsSets";

export default function SetsPage() {
  const setTabs = [
    "All",
    "Bridal Sets",
    "Bedroom Packages",
    "Bathroom Packages",
  ];

  const setItems = [
    {
      image: "/set-bridal-1.jpg",
      title: "Bridal Set – Deluxe",
      desc: "A luxurious collection of lingerie and sleepwear for the modern bride.",
      includes: "Silk robe, lace chemise, satin pajama set, and more.",
      tags: ["Bridal Sets"],
    },
    {
      image: "/set-bridal-2.jpg",
      title: "Bridal Set – Essential",
      desc: "Elegant base set to complete your trousseau with timeless pieces.",
      includes: "Lace camisole, robe, nightdress, slippers.",
      tags: ["Bridal Sets"],
    },
    {
      image: "/set-bedroom-1.jpg",
      title: "Bedroom Package – Premium",
      desc: "Transform your bedroom with our premium bedding set.",
      includes: "Duvet cover, fitted sheet, pillowcases, decorative pillows.",
      tags: ["Bedroom Packages"],
    },
    {
      image: "/set-bedroom-2.jpg",
      title: "Bedroom Package – Comfort",
      desc: "Soft and breathable cotton set for everyday comfort.",
      includes: "Duvet cover set + 2 pillowcases.",
      tags: ["Bedroom Packages"],
    },
    {
      image: "/set-bath-1.jpg",
      title: "Bathroom Package – Luxe",
      desc: "Hotel-quality towels and bath accessories.",
      includes: "4 bath towels, 2 hand towels, bath mat.",
      tags: ["Bathroom Packages"],
    },
    {
      image: "/set-bath-2.jpg",
      title: "Bathroom Package – Everyday",
      desc: "Durable and quick-dry towel set for daily use.",
      includes: "2 bath towels, 2 hand towels.",
      tags: ["Bathroom Packages"],
    },
    {
      image: "/set-mix-1.jpg",
      title: "Trousseau Mix – Signature",
      desc: "Handpicked highlights across bridal, bedroom and bath.",
      includes: "Lace robe, duvet cover set, towel duo.",
      tags: ["Bridal Sets", "Bedroom Packages", "Bathroom Packages"],
    },
  ];

  return (
    <>
      {/* Üst intro/breadcrumb şeridi */}
      <section className="border-b border-border bg-surface-light/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
          <BreadCrumb
            items={[
              { label: "Home", to: "/" },
              { label: "Trousseau Packages" },
            ]}
          />
          <div className="mt-4 text-center">
            <h1 className="text-4xl font-serif font-extrabold tracking-tight text-primary">
              Trousseau Packages
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-secondary">
              Curated collections for your perfect wedding trousseau — discover
              elegant bridal, bedroom and bathroom packages crafted to match
              your style.
            </p>
          </div>
        </div>
      </section>

      {/* Asıl içerik: HomeSets (mevcut bileşen) */}
      <SetsSets
        title="Explore the Collections"
        subtitle="Use the filters to browse our Bridal, Bedroom and Bathroom packages."
        tabs={setTabs}
        items={setItems}
      />

      {/* Alt CTA şeridi (yumuşak kapatma, sayfayı bitirir) */}
      <section className="mx-auto mb-12 max-w-[1400px] px-4 sm:px-6">
        <div className="rounded-xl border border-border bg-contact-bg p-6 text-center">
          <h3 className="text-xl font-semibold text-primary">
            Need help choosing a set?
          </h3>
          <p className="mt-1 text-secondary">
            Our stylists can help you build the perfect trousseau package.
          </p>
          <div className="mt-4">
            <a
              href="/contact"
              className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Talk to a Stylist
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
