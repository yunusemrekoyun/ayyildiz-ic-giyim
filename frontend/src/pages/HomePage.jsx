// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import Hero from "../components/Hero";
import Categories from "../components/categories/Categories";
import HomeProducts from "../components/home-products/HomeProducts";
import HomeProductComments from "../components/home-comments/HomeProductComments";
import HomeCampaigns from "../components/home-campaigns/HomeCampaigns";
import HomeContact from "../components/home-contact/HomeContact";
import HomeSets from "../components/home-sets/HomeSets";
import { productApi, setApi } from "../api";

const FALLBACK_CAMPAIGNS = [
  {
    image: "/cmp-1.jpg",
    title: "Autumn Bedding Event",
    subtitle: "Up to 30% off on premium duvet & sheet sets.",
    badge: "Limited",
    to: "/campaign/autumn-bedding",
  },
  {
    image: "/cmp-2.jpg",
    title: "Bridal Lingerie Picks",
    subtitle: "Elegant designs for your special day.",
    badge: "Top Picks",
    to: "/campaign/bridal-lingerie",
  },
  {
    image: "/cmp-3.jpg",
    title: "Home Towels Bundle",
    subtitle: "Egyptian cotton towels bundle prices.",
    to: "/campaign/towels-bundle",
  },
  {
    image: "/cmp-4.jpg",
    title: "Trousseau Essentials",
    subtitle: "Complete wedding trousseau sets.",
    to: "/campaign/trousseau-essentials",
  },
];

const FALLBACK_COMMENTS = [
  {
    name: "Ayla",
    quote:
      "I absolutely love the quality and elegance of the lingerie I purchased. It’s perfect for my special day!",
    rating: 5,
    avatar: "/c1.png",
  },
  {
    name: "Elif",
    quote:
      "The home textiles are so soft and luxurious. They add a touch of elegance to my bedroom.",
    rating: 5,
    avatar: "/c2.png",
  },
  {
    name: "Fatma",
    quote:
      "The wedding set is stunning! Exactly what I was looking for and the quality is exceptional.",
    rating: 5,
    avatar: "/c3.png",
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Sets state
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);

  const [setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await productApi.list({ limit: 12 });
        if (!mounted) return;
        setFeaturedProducts(data.products || []);
      } catch (err) {
        if (!mounted) setError(extractMessage(err));
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setError]);

  // Fetch sets
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await setApi.list(); // dizi veya {sets:[...]} gelebilir
        const rawSets = Array.isArray(data) ? data : data?.sets || [];
        if (!mounted) return;
        const mapped = mapSetsToCards(rawSets);
        setSets(mapped);
      } catch (e) {
        if (!mounted) setError(extractMessage(e));
        // sessiz
      } finally {
        if (mounted) setLoadingSets(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const newArrivalCards = useMemo(() => {
    return mapProductsToHomeCards(featuredProducts.slice(0, 3));
  }, [featuredProducts]);

  const bestsellerCards = useMemo(() => {
    return mapProductsToHomeCards(featuredProducts.slice(3, 6));
  }, [featuredProducts]);

  // Dynamic tabs from set tags
  const setTabs = useMemo(() => {
    const tagSet = new Set();
    (sets || []).forEach((s) => (s.tags || []).forEach((t) => tagSet.add(t)));
    const arr = Array.from(tagSet);
    return ["All", ...arr];
  }, [sets]);

  return (
    <>
      <Hero
        images={["/hero-1.jpg", "/hero-2.jpg", "/hero-3.jpg", "/hero-4.jpg"]}
        onCta={() => window.scrollTo({ top: 800, behavior: "smooth" })}
      />

      <Categories />

      <section className="mx-auto my-10 max-w-[1400px] px-4 sm:px-6">
        <div className="rounded-xl bg-surface shadow-sm">
          <HomeProducts
            variant="merge-top"
            title="New Arrivals"
            items={newArrivalCards}
            loading={loadingProducts && !newArrivalCards.length}
            className="rounded-t-xl"
          />
          <HomeProducts
            variant="merge-bottom"
            title="Bestsellers"
            items={bestsellerCards}
            loading={loadingProducts && !bestsellerCards.length}
            className="rounded-b-xl"
          />
        </div>
      </section>

      {/* Sets – stil aynı, sadece backend datası ve loading eklendi */}
      <HomeSets
        variant="compact"
        title="Trousseau Packages"
        subtitle="Curated collections for your perfect wedding trousseau"
        tabs={setTabs}
        items={sets}
        viewAllHref="/sets"
        loading={loadingSets}
      />

      <HomeProductComments items={FALLBACK_COMMENTS} />
      <HomeCampaigns items={FALLBACK_CAMPAIGNS} />
      <HomeContact />
    </>
  );
}

function mapProductsToHomeCards(products) {
  if (!products?.length) return [];
  return products.map((product) => ({
    image: product.images?.[0]?.url || "/shop-1.jpg",
    title: product.name,
    subtitle: product.category?.name || "",
    price: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(product.price || 0),
    to: product.slug ? `/product/${product.slug}` : `/product/${product.id}`,
  }));
}

/** Backend set -> HomeSets kart verisi */
function mapSetsToCards(sets) {
  return (sets || []).map((s) => {
    const image = s.images?.[0]?.url || "/set-placeholder.jpg";
    const title = s.name || "Untitled Set";
    const desc = s.description || "";
    const to = `/set/${s.slug || s.id}`;
    // includes: ilk 3 ürün adı
    const productNames = (s.products || [])
      .map((p) => p?.product?.name)
      .filter(Boolean);
    const includes =
      productNames.length > 0
        ? productNames.slice(0, 3).join(", ") +
          (productNames.length > 3 ? " +" + (productNames.length - 3) : "")
        : "";

    // tags: ürün kategorileri isimlerinden uniq
    const tags = Array.from(
      new Set(
        (s.products || [])
          .map((p) => p?.product?.category?.name)
          .filter(Boolean)
      )
    );

    return { image, title, desc, includes, tags, to };
  });
}

function extractMessage(error) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch {
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
