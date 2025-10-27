// src/components/Header.jsx
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Search, ShoppingBag, Heart, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MegaMenu from "./MegaMenu";
import { categoryApi } from "../../api/categories";
import { mapCategoryTree } from "../../utils/catalog";
import { useCart } from "../../hooks/useCart";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../../constants/sites.js";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lng } = useParams();
  const normalizedSite = (lng || DEFAULT_SITE_CODE).toLowerCase();
  const siteCode = SITE_CODES.includes(normalizedSite)
    ? normalizedSite
    : DEFAULT_SITE_CODE;
  const [q, setQ] = useState("");
  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [navError, setNavError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoadingCategories(true);
    (async () => {
      try {
        const tree = await categoryApi.tree({}, { siteCode });
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
  }, [siteCode]);

  const navigationItems = useMemo(() => {
    return (categoryTree || []).map((node) => ({
      id: node.id,
      label: node.name,
      hasChildren: node.children && node.children.length > 0,
      menu: buildMegaMenuData(node, siteCode),
    }));
  }, [categoryTree, siteCode]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    navigate(
      query
        ? `/${siteCode}/shop?q=${encodeURIComponent(query)}`
        : `/${siteCode}/shop`
    );
  };

  const handleLanguageChange = (event) => {
    const next = event.target.value;
    if (!next || next === siteCode) return;
    const segments = location.pathname.split("/").filter(Boolean);
    const remainder = segments.slice(1).join("/");
    const targetPath = remainder ? `/${next}/${remainder}` : `/${next}`;
    navigate(`${targetPath}${location.search}${location.hash}`, {
      replace: true,
    });
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
              <Link
                to={`/${siteCode}`}
                className="group inline-flex items-center gap-3"
              >
                <img
                  src="/logo.png"
                  alt="Ayyıldız İç Giyim"
                  className="h-25 w-25 sm:h-20 sm:w-25 object-contain transition-transform "
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
                  query
                    ? `/${siteCode}/shop?q=${encodeURIComponent(query)}`
                    : `/${siteCode}/shop`
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
              <label className="hidden items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary sm:inline-flex">
                <span className="uppercase text-secondary/70">Lng</span>
                <select
                  value={siteCode}
                  onChange={handleLanguageChange}
                  className="bg-transparent text-xs font-semibold uppercase text-primary outline-none"
                >
                  {SITE_CODES.map((code) => (
                    <option key={code} value={code} className="text-primary">
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-[11px] font-medium text-secondary sm:hidden">
                <span className="uppercase text-secondary/70">Lng</span>
                <select
                  value={siteCode}
                  onChange={handleLanguageChange}
                  className="bg-transparent text-[11px] font-semibold uppercase text-primary outline-none"
                >
                  {SITE_CODES.map((code) => (
                    <option key={code} value={code} className="text-primary">
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to={`/${siteCode}/cart`}
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
                to={`/${siteCode}/account?tab=Wishlist`}
                className="inline-flex rounded-full p-2 hover:bg-surface-hover"
              >
                <Heart className="h-6 w-6 text-secondary" />
              </Link>
              <Link
                to={`/${siteCode}/account`}
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
                      onRootClick={() =>
                        navigate(`/${siteCode}/shop?category=${item.id}`)
                      }
                    />
                  ) : (
                    <Link
                      key={item.id}
                      to={`/${siteCode}/shop?category=${item.id}`}
                      className="shrink-0 hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              <Link
                to={`/${siteCode}/sale`}
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

function buildMegaMenuData(node, siteCode) {
  const children = node.children || [];
  if (!children.length) return [];

  return [
    {
      title: `View all ${node.name}`,
      to: `/${siteCode}/shop?category=${node.id}`,
      key: `${node.id}-all`,
      children: [],
    },
    ...children.map((child) => ({
      title: child.name,
      to: `/${siteCode}/shop?category=${child.id}`,
      key: child.id,
      image: child.image,
      children: (child.children || []).map((grand) => ({
        title: grand.name,
        to: `/${siteCode}/shop?category=${grand.id}`,
        key: grand.id,
        image: grand.image,
      })),
    })),
  ];
}
