// src/pages/HomePage.jsx
import Hero from "../components/Hero";
import Categories from "../components/categories/Categories";
import HomeProducts from "../components/home-products/HomeProducts";
import HomeProductComments from "../components/home-comments/HomeProductComments";
import HomeCampaigns from "../components/home-campaigns/HomeCampaigns";
import HomeContact from "../components/home-contact/HomeContact";
import HomeSets from "../components/home-sets/HomeSets";

export default function HomePage() {
  const categories = [
    { title: "Lingerie", image: "/cat-1.jpg", to: "/lingerie" },
    { title: "Home Textiles", image: "/cat-2.jpg", to: "/home-textiles" },
    { title: "Wedding Sets", image: "/cat-3.jpg", to: "/wedding-sets" },
    { title: "Trousseau", image: "/cat-4.jpg", to: "/trousseau" },
  ];

  const newArrivals = [
    {
      image: "/na-1.jpg",
      title: "Lace Dream Bodysuit",
      subtitle: "Explore the latest lingerie designs",
      price: "€89.90",
      to: "/product/lace-dream-bodysuit",
    },
    {
      image: "/na-2.jpg",
      title: "Satin Bedding Set",
      subtitle: "Discover our new home textile range",
      price: "€199.90",
      to: "/product/satin-bedding-set",
    },
    {
      image: "/na-3.jpg",
      title: "Pearl Embellished Robe",
      subtitle: "Find the perfect wedding set",
      price: "€149.90",
      to: "/product/pearl-embellished-robe",
    },
  ];

  const bestsellers = [
    {
      image: "/bs-1.jpg",
      title: "Silk Charm Chemise",
      subtitle: "Our most loved lingerie designs",
      price: "€99.90",
      to: "/product/silk-charm-chemise",
    },
    {
      image: "/bs-2.jpg",
      title: "Egyptian Cotton Towel Set",
      subtitle: "Best selling home textile products",
      price: "€79.90",
      to: "/product/egyptian-cotton-towel",
    },
    {
      image: "/bs-3.jpg",
      title: "The Royal Trousseau",
      subtitle: "Customer’s favorite wedding sets",
      price: "€699.90",
      to: "/product/royal-trousseau",
    },
  ];

  const comments = [
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

  const campaigns = [
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
  const setTabs = [
    "All",
    "Bridal Sets",
    "Bedroom Packages",
    "Bathroom Packages",
  ];

  const setItems = [
    // Bridal
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

    // Bedroom
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

    // Bathroom
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

    // Mixed (shows under All)
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
      <Hero
        images={[
          "/hero-1.jpg", // görseldeki yatak odası fotoğrafını buraya koy
          "/hero-2.jpg",
          "/hero-3.jpg",
          "/hero-4.jpg",
        ]}
        onCta={() => console.log("CTA clicked")}
      />
      <Categories items={categories} />
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 my-10">
        <div className="rounded-xl bg-surface shadow-sm">
          <HomeProducts
            variant="merge-top"
            title="New Arrivals"
            items={newArrivals}
            className="rounded-t-xl"
          />
          {/* İki bölüm arasında biraz iç boşluk istersen burayı ayarla */}
          {/* <div className="h-4"></div> */}

          <HomeProducts
            variant="merge-bottom"
            title="Bestsellers"
            items={bestsellers}
            className="rounded-b-xl"
          />
        </div>
      </section>
      <HomeSets
        variant="compact"
        title="Trousseau Packages"
        subtitle="Curated collections for your perfect wedding trousseau"
        tabs={setTabs}
        items={setItems}
        viewAllHref="/sets"
      />
      <HomeProductComments items={comments} />;
      <HomeCampaigns items={campaigns} />;
      <HomeContact />
    </>
  );
}
