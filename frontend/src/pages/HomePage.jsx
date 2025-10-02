// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import Hero from "../components/Hero";
import Categories from "../components/categories/Categories";
import HomeProducts from "../components/home-products/HomeProducts";
import HomeProductComments from "../components/home-comments/HomeProductComments";
import HomeCampaigns from "../components/home-campaigns/HomeCampaigns";
import HomeContact from "../components/home-contact/HomeContact";
import HomeSets from "../components/home-sets/HomeSets";
import { productApi } from "../api";

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

const SET_TABS = [
  "All",
  "Bridal Sets",
  "Bedroom Packages",
  "Bathroom Packages",
];

const SET_ITEMS = [
  {
    image: "/set-bridal-1.jpg",
    title: "Bridal Set – Deluxe",
    desc: "A luxurious collection for the modern bride.",
    includes: "Silk robe, lace chemise, satin pajama set, and more.",
    tags: ["Bridal Sets"],
  },
  {
    image: "/set-bridal-2.jpg",
    title: "Bridal Set – Essential",
    desc: "Elegant base set to complete your trousseau.",
    includes: "Lace camisole, robe, nightdress, slippers.",
    tags: ["Bridal Sets"],
  },
  {
    image: "/set-bedroom-1.jpg",
    title: "Bedroom Package – Premium",
    desc: "Transform your bedroom with premium bedding.",
    includes: "Duvet cover, fitted sheet, pillowcases, decorative pillows.",
    tags: ["Bedroom Packages"],
  },
  {
    image: "/set-bath-1.jpg",
    title: "Bathroom Package – Luxe",
    desc: "Hotel-quality towels and bath accessories.",
    includes: "4 bath towels, 2 hand towels, bath mat.",
    tags: ["Bathroom Packages"],
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
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

  const newArrivalCards = useMemo(() => {
    return mapProductsToHomeCards(featuredProducts.slice(0, 3));
  }, [featuredProducts]);

  const bestsellerCards = useMemo(() => {
    return mapProductsToHomeCards(featuredProducts.slice(3, 6));
  }, [featuredProducts]);

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

      <HomeSets
        variant="compact"
        title="Trousseau Packages"
        subtitle="Curated collections for your perfect wedding trousseau"
        tabs={SET_TABS}
        items={SET_ITEMS}
        viewAllHref="/sets"
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

function extractMessage(error) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch (e) {
      console.error(e);
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
