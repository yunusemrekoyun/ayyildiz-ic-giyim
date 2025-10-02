// src/components/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User } from "lucide-react";
import MegaMenu from "./MegaMenu";
import { useState } from "react";

/* --------- Menüler --------- */
const LINGERIE_DATA = [
  {
    title: "Bras & Bralettes",
    to: "/lingerie/bras",
    children: [
      {
        title: "Lace Bras",
        to: "/lingerie/bras/lace",
        image: "/na-1.jpg",
        description: "Romantic lace support",
      },
      {
        title: "Wireless",
        to: "/lingerie/bras/wireless",
        image: "/bs-1.jpg",
        description: "Everyday comfort",
      },
      {
        title: "Sports Bras",
        to: "/lingerie/bras/sports",
        image: "/cat-1.jpg",
        description: "Active support",
      },
      {
        title: "Strapless",
        to: "/lingerie/bras/strapless",
        image: "/cat-2.jpg",
        description: "Perfect under dresses",
      },
    ],
  },
  {
    title: "Panties",
    to: "/lingerie/panties",
    children: [
      { title: "Bikini", to: "/lingerie/panties/bikini", image: "/na-2.jpg" },
      {
        title: "High-Waist",
        to: "/lingerie/panties/highwaist",
        image: "/bs-2.jpg",
      },
      {
        title: "Seamless",
        to: "/lingerie/panties/seamless",
        image: "/cat-3.jpg",
      },
      { title: "Cotton", to: "/lingerie/panties/cotton", image: "/cat-4.jpg" },
    ],
  },
  {
    title: "Nightwear",
    to: "/lingerie/nightwear",
    children: [
      {
        title: "Silk Chemise",
        to: "/lingerie/nightwear/chemise",
        image: "/bs-3.jpg",
      },
      {
        title: "Satin PJ Sets",
        to: "/lingerie/nightwear/pj",
        image: "/na-3.jpg",
      },
      {
        title: "Robes & Kimonos",
        to: "/lingerie/nightwear/robes",
        image: "/cmp-1.jpg",
      },
      {
        title: "Bridal Nightwear",
        to: "/lingerie/nightwear/bridal",
        image: "/cmp-2.jpg",
      },
    ],
  },
];

const TEXTILES_DATA = [
  {
    title: "Bedding",
    to: "/home-textiles/bedding",
    children: [
      {
        title: "Duvet Covers",
        to: "/home-textiles/bedding/duvet",
        image: "/set-bedroom-1.jpg",
      },
      {
        title: "Sheets",
        to: "/home-textiles/bedding/sheets",
        image: "/set-bedroom-2.jpg",
      },
      {
        title: "Pillows",
        to: "/home-textiles/bedding/pillows",
        image: "/na-2.jpg",
      },
    ],
  },
  {
    title: "Bath",
    to: "/home-textiles/bath",
    children: [
      {
        title: "Towel Sets",
        to: "/home-textiles/bath/towels",
        image: "/set-bath-1.jpg",
      },
      {
        title: "Bath Mats",
        to: "/home-textiles/bath/mats",
        image: "/set-bath-2.jpg",
      },
    ],
  },
];

const WEDDING_DATA = [
  {
    title: "Bridal Sets",
    to: "/wedding-sets/bridal",
    children: [
      {
        title: "Deluxe",
        to: "/wedding-sets/bridal/deluxe",
        image: "/set-bridal-1.jpg",
      },
      {
        title: "Essential",
        to: "/wedding-sets/bridal/essential",
        image: "/set-bridal-2.jpg",
      },
    ],
  },
  {
    title: "Trousseau Packages",
    to: "/sets",
    children: [
      { title: "Signature Mix", to: "/sets#mix", image: "/set-mix-1.jpg" },
      {
        title: "Premium Bedroom",
        to: "/sets#bedroom",
        image: "/set-bedroom-1.jpg",
      },
    ],
  },
];

/* ----------------------------------- */

export default function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  return (
    <header className="sticky top-0 z-[70] bg-white/95 backdrop-blur border-b border-border">
      {/* ÜST ŞERİT */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* 3 kolon: SOL logo | ORTA arama | SAĞ ikonlar */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-20 gap-4">
          {/* SOL: Logo + Marka */}
          <div className="flex items-center justify-start">
            <Link to="/" className="group inline-flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Ayyıldız İç Giyim"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform group-hover:scale-[1.04]"
                draggable="false"
              />
              <span className="font-serif font-extrabold tracking-tight text-primary text-2xl sm:text-3xl">
                Ayyıldız İç Giyim
              </span>
            </Link>
          </div>

          {/* ORTA: Arama */}
          <div className="flex justify-center">
            <form
              onSubmit={onSearchSubmit}
              className="hidden md:flex items-center w-full max-w-md lg:max-w-lg rounded-full border border-border pl-3 pr-2 py-2 bg-white shadow-sm"
            >
              <Search className="h-4 w-4 text-secondary" />
              <input
                type="text"
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="ml-2 w-full border-none text-sm outline-none placeholder:text-secondary/60"
              />
            </form>

            {/* Mobile: yalnız ikon (orta konumda kalır) */}
            <button
              onClick={() => {
                const query = q.trim();
                navigate(
                  query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"
                );
              }}
              className="md:hidden inline-flex rounded-full p-2 hover:bg-surface-hover"
              aria-label="Search"
              title="Search"
            >
              <Search className="h-6 w-6 text-secondary" />
            </button>
          </div>

          {/* SAĞ: İkonlar */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <Link
              to="/cart"
              className="relative inline-flex rounded-full p-2 hover:bg-surface-hover"
            >
              <ShoppingBag className="h-6 w-6 text-secondary" />
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">
                2
              </span>
            </Link>
            <Link
              to="/wishlist"
              className="inline-flex rounded-full p-2 hover:bg-surface-hover"
            >
              <Heart className="h-6 w-6 text-secondary" />
            </Link>
            <Link
              to="/account"
              className="inline-flex rounded-full p-2 hover:bg-surface-hover"
            >
              <User className="h-6 w-6 text-secondary" />
            </Link>
          </div>
        </div>
      </div>

      {/* ALT ŞERİT: Kategori / MegaMenu */}
      {/* ALT ŞERİT: Kategori / MegaMenu */}
      <div className="border-t border-border/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav
            className="
              flex items-center justify-center gap-6
              h-14 text-sm font-medium
              overflow-x-auto no-scrollbar
            "
          >
            <Link to="/new" className="shrink-0 hover:text-accent">
              New Arrivals
            </Link>

            <MegaMenu label="Lingerie" data={LINGERIE_DATA} />
            <MegaMenu label="Home Textiles" data={TEXTILES_DATA} />
            <MegaMenu label="Wedding Sets" data={WEDDING_DATA} />

            <Link to="/sets" className="shrink-0 hover:text-accent">
              Trousseau
            </Link>
            <Link
              to="/sale"
              className="shrink-0 text-accent hover:text-accent-hover"
            >
              Sale
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
