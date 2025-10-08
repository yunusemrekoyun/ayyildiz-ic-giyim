import { useEffect, useMemo, useState } from "react";
import BreadCrumb from "../components/shop/BreadCrumb";
import SetsSets from "../components/sets-sets/SetsSets";
import { setApi } from "../api/sets";

export default function SetsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // 1. normal istek
        let res = await setApi.list(); // beklenen { sets: [...] }

        // esnek okuma
        let sets = normalizeSetsResponse(res);

        // 2. boşsa includeHidden ile tekrar dene
        if (!sets.length) {
          const res2 = await setApi.list({ includeHidden: true });

          sets = normalizeSetsResponse(res2);
        }

        const mapped = mapSetsToCards(sets);
        if (mounted) {
          setItems(mapped);
        }
      } catch (e) {
        console.error("SETS PAGE - fetch error:", e);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tabs = useMemo(() => {
    const tagSet = new Set();
    for (const s of items) (s.tags || []).forEach((t) => tagSet.add(String(t)));
    return ["All", ...Array.from(tagSet)];
  }, [items]);

  return (
    <>
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

      <SetsSets
        title="Explore the Collections"
        subtitle="Use the filters to browse our Bridal, Bedroom and Bathroom packages."
        tabs={tabs}
        items={items}
        loading={loading}
      />

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

/** Response’u esnek şekilde normalize et */
function normalizeSetsResponse(res) {
  // Bazı client’larda res direkt dizi olabilir; bazılarında { sets }, bazılarında { data: { sets } }
  const maybe = res?.sets || res?.data?.sets || res;
  return Array.isArray(maybe) ? maybe : [];
}

/** backend set -> kart */
function mapSetsToCards(sets) {
  return (sets || []).map((s) => {
    const image = s?.images?.[0]?.url || "/set-placeholder.jpg";
    const title = s?.name || "Untitled Set";
    const desc = s?.description || "";

    const productNames = (s?.products || [])
      .map((p) => p?.product?.name)
      .filter(Boolean);

    const includes =
      productNames.length > 0
        ? productNames.slice(0, 3).join(", ") +
          (productNames.length > 3 ? ` +${productNames.length - 3}` : "")
        : "";

    const tags = Array.from(
      new Set(
        (s?.products || [])
          .map((p) => p?.product?.category?.name)
          .filter(Boolean)
      )
    );

    const slugOrId = s?.slug || s?.id || s?._id;
    const to = slugOrId ? `/set/${slugOrId}` : "#";

    const price = Number(s?.price ?? 0);
    const finalPrice = Number(s?.finalPrice ?? price);
    const discount = s?.discount?.percentage;

    return { image, title, desc, includes, tags, to, price, finalPrice, discount };
  });
}
