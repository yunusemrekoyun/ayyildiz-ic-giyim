// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import Hero from "../components/Hero";
import Categories from "../components/categories/Categories";
import HomeProducts from "../components/home-products/HomeProducts";
import HomeProductComments from "../components/home-comments/HomeProductComments";
import HomeCampaigns from "../components/home-campaigns/HomeCampaigns";
import HomeContact from "../components/home-contact/HomeContact";
import HomeSets from "../components/home-sets/HomeSets";
import { productApi } from "../api/products";
import { setApi } from "../api/sets";
import { heroApi } from "../api/heroes";
import { campaignApi } from "../api/campaigns";

const FALLBACK_CAMPAIGNS = [
  {
    image: "/cmp-1.jpg",
    title: "Autumn Bedding Event",
    subtitle: "Up to 30% off on premium duvet & sheet sets.",
    badge: "Limited",
    to: "/campaign/autumn-bedding",
    variant: "big",
  },
  {
    image: "/cmp-2.jpg",
    title: "Bridal Lingerie Picks",
    subtitle: "Elegant designs for your special day.",
    badge: "Top Picks",
    to: "/campaign/bridal-lingerie",
    variant: "wide",
  },
  {
    image: "/cmp-3.jpg",
    title: "Home Towels Bundle",
    subtitle: "Egyptian cotton towels bundle prices.",
    to: "/campaign/towels-bundle",
    variant: "small",
  },
  {
    image: "/cmp-4.jpg",
    title: "Trousseau Essentials",
    subtitle: "Complete wedding trousseau sets.",
    to: "/campaign/trousseau-essentials",
    variant: "small",
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
  // HERO (dinamik)
  const [heroes, setHeroes] = useState([]);
  const [loadingHeroes, setLoadingHeroes] = useState(true);

  // Products
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Sets
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // error
  const [error, setError] = useState(null);

  // HERO fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await heroApi.list();
        if (!mounted) return;
        setHeroes(list || []);
      } catch (err) {
        if (mounted) setError(extractMessage(err));
      } finally {
        if (mounted) setLoadingHeroes(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setError]);

  // Products fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await productApi.list({ limit: 12 });
        if (!mounted) return;
        setFeaturedProducts(data.products || []);
      } catch (err) {
        if (mounted) setError(extractMessage(err));
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setError]);

  // Sets fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await setApi.list();
        const rawSets = Array.isArray(data) ? data : data?.sets || [];
        if (!mounted) return;
        setSets(mapSetsToCards(rawSets));
      } catch (e) {
        if (mounted) setError(extractMessage(e));
      } finally {
        if (mounted) setLoadingSets(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setError]);

  // Campaign fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await campaignApi.listHome();
        if (!mounted) return;
        setCampaigns(list || []);
      } catch (err) {
        if (mounted) {
          setError((prev) => prev || extractMessage(err));
        }
      } finally {
        if (mounted) setLoadingCampaigns(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const newArrivalCards = useMemo(
    () => mapProductsToHomeCards(featuredProducts.slice(0, 3)),
    [featuredProducts]
  );
  const bestsellerCards = useMemo(
    () => mapProductsToHomeCards(featuredProducts.slice(3, 6)),
    [featuredProducts]
  );
  const setTabs = useMemo(() => {
    const tagSet = new Set();
    (sets || []).forEach((s) => (s.tags || []).forEach((t) => tagSet.add(t)));
    return ["All", ...Array.from(tagSet)];
  }, [sets]);

  const campaignItems = useMemo(() => {
    if (!campaigns.length) return [];
    return mapCampaignsToHomeCards(campaigns.slice(0, 4));
  }, [campaigns]);

  const campaignsToRender =
    campaignItems.length > 0 ? campaignItems : FALLBACK_CAMPAIGNS;

  // Hero slaytlarına fallback
  const heroSlides = heroes.length
    ? heroes
    : [
        {
          id: "f1",
          title: "Celebrate Your Moments in Style",
          subtitle: "Discover our exclusive collection.",
          buttonText: "Shop Now",
          image: { url: "/hero-1.jpg" },
          video: null,
          computedLink: "/shop",
        },
        {
          id: "f2",
          title: "Elegance for Every Day",
          subtitle: "Timeless pieces for your wardrobe.",
          buttonText: "Explore",
          image: { url: "/hero-2.jpg" },
          video: null,
          computedLink: "/shop",
        },
      ];

  return (
    <>
      {/* Hata bandı (error state'i aktif kullanımı) */}
      {error && (
        <div
          role="alert"
          className="mx-auto mb-4 max-w-[1400px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Dinamik HERO */}
      <Hero slides={heroSlides} imageAutoMs={6000} loading={loadingHeroes} />

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
        tabs={setTabs}
        items={sets}
        viewAllHref="/sets"
        loading={loadingSets}
      />

      <HomeProductComments items={FALLBACK_COMMENTS} />
      <HomeCampaigns items={campaignsToRender} loading={loadingCampaigns} />
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
    price: product.price,
    finalPrice: product.finalPrice ?? product.price,
    discount: product.discount?.percentage,
    to: product.slug ? `/product/${product.slug}` : `/product/${product.id}`,
  }));
}

function mapSetsToCards(sets) {
  return (sets || []).map((s) => {
    const image = s.images?.[0]?.url || "/set-placeholder.jpg";
    const title = s.name || "Untitled Set";
    const desc = s.description || "";
    const to = `/set/${s.slug || s.id}`;
    const price = Number(s.price ?? 0);
    const finalPrice = Number(s.finalPrice ?? price);
    const discount = s.discount?.percentage;
    const productNames = (s.products || [])
      .map((p) => p?.product?.name)
      .filter(Boolean);
    const includes =
      productNames.length > 0
        ? productNames.slice(0, 3).join(", ") +
          (productNames.length > 3 ? " +" + (productNames.length - 3) : "")
        : "";
    const tags = Array.from(
      new Set(
        (s.products || [])
          .map((p) => p?.product?.category?.name)
          .filter(Boolean)
      )
    );
    return { image, title, desc, includes, tags, to, price, finalPrice, discount };
  });
}

function mapCampaignsToHomeCards(list) {
  return (list || []).map((campaign) => ({
    id: campaign.id,
    to: campaign.computedLink || "/shop",
    image: campaign.image?.url || "/cmp-1.jpg",
    title: campaign.name || "Campaign",
    subtitle: campaign.description || "",
    badge: campaign.badge || "",
    ctaText: campaign.ctaText || "Shop Now",
    variant: mapLayoutToVariant(campaign.layout),
  }));
}

function mapLayoutToVariant(layout) {
  const normalized = String(layout || "").toUpperCase();
  if (normalized === "BIG") return "big";
  if (normalized === "WIDE") return "wide";
  return "small";
}

function extractMessage(error) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch {
      // ignore
    }
    return error.message;
  }
  return String(error);
}
