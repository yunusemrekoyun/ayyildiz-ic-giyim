// src/components/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MegaMenu from "./MegaMenu";
import { categoryApi } from "../../api";
import { mapCategoryTree } from "../../utils/catalog";
import { useCart } from "../../hooks/useCart";

export default function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [navError, setNavError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tree = await categoryApi.tree();
        if (!mounted) return;
        setCategoryTree(mapCategoryTree(tree));
      } catch (error) {
        if (mounted) setNavError(error);
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const navigationItems = useMemo(() => {
    return (categoryTree || []).map((node) => ({
      id: node.id,
      label: node.name,
      hasChildren: node.children && node.children.length > 0,
      menu: buildMegaMenuData(node),
    }));
  }, [categoryTree]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-[70]">
      {/* Oval üst çerçeve: sadece bu sarmalayıcı oval/blur/border alıyor */}
      <div className="bg-white/95 backdrop-blur border-b border-border rounded-t-2xl">
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
                {totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">
                    {totalItems}
                  </span>
                )}
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
        <div className="border-t border-border/70 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <nav
              className="
                flex items-center justify-center gap-6
                h-14 text-sm font-medium
                overflow-x-auto no-scrollbar
              "
            >
              {loadingCategories && (
                <span className="text-sm text-secondary">Loading...</span>
              )}
              {!loadingCategories && navError && (
                <span className="text-sm text-secondary">
                  Categories unavailable
                </span>
              )}
              {!loadingCategories &&
                !navError &&
                navigationItems.map((item) =>
                  item.hasChildren ? (
                    <MegaMenu
                      key={item.id}
                      label={item.label}
                      data={item.menu}
                      onRootClick={() => navigate(`/shop?category=${item.id}`)}
                    />
                  ) : (
                    <Link
                      key={item.id}
                      to={`/shop?category=${item.id}`}
                      className="shrink-0 hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              <Link
                to="/sale"
                className="shrink-0 text-accent hover:text-accent-hover"
              >
                Sale
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function buildMegaMenuData(node) {
  const children = node.children || [];
  if (!children.length) return [];

  return [
    {
      title: `View all ${node.name}`,
      to: `/shop?category=${node.id}`,
      key: `${node.id}-all`,
      children: [],
    },
    ...children.map((child) => ({
      title: child.name,
      to: `/shop?category=${child.id}`,
      key: child.id,
      image: child.image,
      children: (child.children || []).map((grand) => ({
        title: grand.name,
        to: `/shop?category=${grand.id}`,
        key: grand.id,
        image: grand.image,
      })),
    })),
  ];
}
