// src/components/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User } from "lucide-react";
import MegaMenu from "./MegaMenu"; // dosyan farklı klasördeyse: "./nav/MegaMenu"
import { useState } from "react";

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

export default function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Sol: Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-serif font-bold text-primary"
        >
          <img
            src="/logo.png"
            alt="Ayyıldız İç Giyim"
            className="h-12 w-12 object-contain"
          />
          Ayyıldız İç Giyim
        </Link>

        {/* Orta: Menü */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/new" className="hover:text-accent">
            New Arrivals
          </Link>

          <MegaMenu label="Lingerie" data={LINGERIE_DATA} />
          <MegaMenu label="Home Textiles" data={TEXTILES_DATA} />
          <MegaMenu label="Wedding Sets" data={WEDDING_DATA} />

          <Link to="/sets" className="hover:text-accent">
            Trousseau
          </Link>
          <Link to="/sale" className="text-accent hover:text-accent-hover">
            Sale
          </Link>
        </nav>

        {/* Sağ: Arama ve ikonlar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <form
            onSubmit={onSearchSubmit}
            className="hidden sm:flex items-center rounded-full border border-border px-3 py-1"
          >
            <Search className="h-4 w-4 text-secondary" />
            <input
              type="text"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="ml-2 w-32 border-none text-sm outline-none placeholder:text-secondary/60"
            />
          </form>

          {/* Sepet */}
          <Link to="/cart" className="relative">
            <ShoppingBag className="h-6 w-6 text-secondary" />
            <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-accent text-xs text-white">
              2
            </span>
          </Link>

          {/* Favori */}
          <Link to="/wishlist" className="inline-flex">
            <Heart className="h-6 w-6 text-secondary" />
          </Link>

          {/* Kullanıcı */}
          <Link to="/account" className="inline-flex">
            <User className="h-6 w-6 text-secondary" />
          </Link>
        </div>
      </div>
    </header>
  );
}
