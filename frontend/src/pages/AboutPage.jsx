import BreadCrumb from "../components/shop/BreadCrumb";
import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <main className="bg-surface-light/60">
      {/* Top breadcrumb + hero */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb items={[{ label: "Home", to: "/" }, { label: "About" }]} />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-10">
        <div className="rounded-2xl border border-border bg-white/80 p-8 sm:p-12 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">
            About Evim &amp; Stil
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-secondary">
            Discover the story behind our passion for bringing elegant lingerie
            and home textiles to the heart of the community—crafted with care,
            rooted in quality, and designed to feel like home.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl ring-1 ring-border">
            <img
              src="/about-hero.jpg"
              alt="Boutique interior"
              className="h-[340px] w-full object-cover"
              draggable="false"
            />
          </div>
        </div>
      </section>

      {/* Story + Vision (two columns with vertical markers) */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Left image card */}
          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <img
                src="/about-store.jpg"
                alt="Calm corner"
                className="h-full w-full object-cover md:h-[560px]"
                draggable="false"
              />
            </div>
          </div>

          {/* Right timeline feel */}
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-border bg-contact-bg p-6 sm:p-8">
              <DotBlock
                title="Our Story"
                text="Evim & Stil was founded with a simple idea: elevate everyday life with beautifully-made essentials. From a tiny studio to a multi-location boutique, our journey has always been guided by craftsmanship, comfort and kindness."
              />
              <Separator />
              <DotBlock
                title="Our Vision"
                text="To be the most trusted destination for premium lingerie and home textiles—blending European finesse with Turkish craftsmanship, and shaping serene, elegant spaces for modern living."
              />
              <Separator />
              <DotBlock
                title="Our Values"
                text="Quality without compromise, timeless design over fast trends, and an experience that feels personal. We work with responsible mills and long-term partners to ensure durability, touch, and fit you can rely on."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats / badges */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Years of Craft" value="14+" />
          <Stat label="Happy Customers" value="120K+" />
          <Stat label="Stores & Studios" value="6" />
          <Stat label="Eco Fabrics" value="80%" />
        </div>
      </section>

      {/* Materials + Responsibility */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-extrabold text-primary">
                Materials &amp; Responsibility
              </h2>
              <p className="mt-2 text-secondary">
                We select breathable cottons, silky satins and durable blends
                from audited suppliers. Over 80% of our fabric range is
                OEKO-TEX® or equivalent certified. Packaging is plastic-light,
                and most of our suppliers are within regional logistics
                corridors to reduce transport.
              </p>

              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <li className="rounded-lg border border-border bg-contact-bg p-3">
                  • OEKO-TEX® certified dye houses
                </li>
                <li className="rounded-lg border border-border bg-contact-bg p-3">
                  • Responsible water & energy use
                </li>
                <li className="rounded-lg border border-border bg-contact-bg p-3">
                  • Long-lasting stitch & finish checks
                </li>
                <li className="rounded-lg border border-border bg-contact-bg p-3">
                  • Reusable & recyclable packaging
                </li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src="/about-fabric.jpg"
                alt="Fabric detail"
                className="h-full w-full object-cover md:h-[360px]"
                draggable="false"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team/CTA ribbon */}
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        <div className="rounded-2xl border border-border bg-surface-light p-6 sm:p-8 text-center">
          <h3 className="font-serif text-2xl font-extrabold text-primary">
            Visit Our Boutique in Berlin
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-secondary">
            Experience the textures in person and let our stylists help you
            build the perfect trousseau—bridal sets, bedding packages and more.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              to="/sets"
              className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Explore Packages
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm text-primary hover:bg-surface-hover"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- tiny subcomponents ---------- */

function DotBlock({ title, text }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-4">
      <span className="mt-1 inline-block h-3 w-3 rounded-full bg-accent" />
      <div>
        <h3 className="font-serif text-xl font-semibold text-primary">
          {title}
        </h3>
        <p className="mt-2 text-secondary">{text}</p>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="my-6 h-px w-full bg-border" />;
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 text-center">
      <div className="font-serif text-3xl font-extrabold text-primary">
        {value}
      </div>
      <div className="mt-1 text-sm text-secondary">{label}</div>
    </div>
  );
}
