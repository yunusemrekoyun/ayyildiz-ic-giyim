// src/pages/ShopPage.jsx
import { useMemo, useState } from "react";
import BreadCrumb from "../components/shop/BreadCrumb";
import ShopPageFilter from "../components/shop/ShopPageFilter";
import ShopPageProducts from "../components/shop/ShopPageProducts";

const ALL_CATEGORIES = [
  "All",
  "Luxury Sets",
  "Classic Sets",
  "Modern Sets",
  "Minimalist",
  "Romantic",
];

const DUMMY_PRODUCTS = [
  {
    id: 1,
    image: "/shop-1.jpg",
    title: "Luxury Trousseau Set – Serenity",
    price: 350,
    categories: ["Luxury Sets", "Romantic"],
    colors: ["#e6df9e", "#c6bfbf"],
    sizes: ["M", "L"],
  },
  {
    id: 2,
    image: "/shop-2.jpg",
    title: "Classic Trousseau Set – Elegance",
    price: 280,
    categories: ["Classic Sets"],
    colors: ["#76a6a4", "#c6cdd6"],
    sizes: ["S", "M"],
  },
  {
    id: 3,
    image: "/shop-3.jpg",
    title: "Modern Trousseau Set – Harmony",
    price: 320,
    categories: ["Modern Sets"],
    colors: ["#a3b8a8", "#d6d6d6"],
    sizes: ["M", "L"],
  },
  {
    id: 4,
    image: "/shop-4.jpg",
    title: "Minimalist Trousseau Set – Simplicity",
    price: 250,
    categories: ["Minimalist"],
    colors: ["#e7e7e7", "#c8d2d0"],
    sizes: ["S", "M"],
  },
  {
    id: 5,
    image: "/shop-5.jpg",
    title: "Romantic Trousseau Set – Affection",
    price: 300,
    categories: ["Romantic"],
    colors: ["#e4c6cf", "#d9dfe8"],
    sizes: ["M", "L"],
  },
  {
    id: 6,
    image: "/shop-6.jpg",
    title: "Luxury Trousseau Set – Opulence",
    price: 400,
    categories: ["Luxury Sets"],
    colors: ["#a3b8a8", "#c6bfbf"],
    sizes: ["L"],
  },
];

export default function ShopPage() {
  // filtre state’leri
  const [activeCat, setActiveCat] = useState("All");
  const [size, setSize] = useState("");
  const [color, setColor] = useState(""); // hex string
  const [price, setPrice] = useState(500); // max fiyat

  const filtered = useMemo(() => {
    return DUMMY_PRODUCTS.filter((p) => {
      const byCat = activeCat === "All" || p.categories.includes(activeCat);
      const bySize = !size || p.sizes.includes(size);
      const byColor = !color || p.colors.includes(color);
      const byPrice = p.price <= price;
      return byCat && bySize && byColor && byPrice;
    });
  }, [activeCat, size, color, price]);

  const resetFilters = () => {
    setActiveCat("All");
    setSize("");
    setColor("");
    setPrice(500);
  };

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <BreadCrumb
        items={[{ label: "Home", to: "/" }, { label: "Trousseau Sets" }]}
      />

      {/* Başlık & açıklama */}
      <div className="text-center mt-4">
        <h1 className="text-4xl font-serif font-extrabold tracking-tight text-primary">
          Trousseau Sets
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-secondary">
          Explore our curated collection of trousseau sets, perfect for creating
          a harmonious and stylish home for the newlyweds.
        </p>
      </div>

      {/* Grid: sol filtre – sağ ürünler */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12">
        <aside className="md:col-span-3">
          <ShopPageFilter
            categories={ALL_CATEGORIES}
            activeCat={activeCat}
            onCatChange={setActiveCat}
            size={size}
            onSizeChange={setSize}
            color={color}
            onColorChange={setColor}
            price={price}
            onPriceChange={setPrice}
            onReset={resetFilters}
          />
        </aside>

        <div className="md:col-span-9">
          <ShopPageProducts products={filtered} />
        </div>
      </div>
    </section>
  );
}
