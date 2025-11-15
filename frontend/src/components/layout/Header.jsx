// src/components/layout/Header.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Layers,
} from "lucide-react";
import MegaMenu from "./MegaMenu";
import { categoryApi } from "../../api/categories";
import { mapCategoryTree } from "../../utils/catalog";
import { useCart } from "../../hooks/useCart";
import LanguageSwitcher from "../LanguageSwitcher.jsx";
import { useStorefrontLang } from "../../context/LangContext.jsx";
import { useStaticTranslation } from "../../i18n/staticContent.js";

export default function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categoryTree, setCategoryTree] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [navError, setNavError] = useState(null);
  const { lang } = useStorefrontLang();
  const t = useStaticTranslation();
  const { totalItems } = useCart();

  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [activeChildId, setActiveChildId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoadingCategories(true);
    (async () => {
      try {
        const tree = await categoryApi.tree(lang);
        if (!mounted) return;
        const normalized = normalizeTree(mapCategoryTree(tree) || []);
        setCategoryTree(normalized);
        setNavError(null);
      } catch (error) {
        if (mounted) setNavError(error);
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  useEffect(() => {
    if (categoryTree.length && !activeCategoryId) {
      setActiveCategoryId(categoryTree[0].id);
    }
  }, [categoryTree, activeCategoryId]);

  useEffect(() => {
    const root = categoryTree.find((node) => node.id === activeCategoryId);
    if (!root) return;
    setActiveChildId((prev) => {
      if (root.children?.some((child) => child.id === prev)) return prev;
      return root.children?.[0]?.id ?? null;
    });
  }, [activeCategoryId, categoryTree]);

  const navigationItems = useMemo(() => {
    return (categoryTree || []).map((node) => ({
      id: node.id,
      label: node.name,
      hasChildren: node.children && node.children.length > 0,
      menu: buildMegaMenuData(node),
    }));
  }, [categoryTree]);

  const runSearch = () => {
    const query = q.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    runSearch();
  };

  const mobileNavItems = [
    {
      key: "categories",
      label: t("header.categories") || "Kategoriler",
      icon: Layers,
      onClick: () => setMobileCategoryOpen(true),
    },
    {
      key: "wishlist",
      label: t("header.wishlist") || "Favoriler",
      icon: Heart,
      to: "/account?tab=Wishlist",
    },
    {
      key: "account",
      label: t("header.account") || "Hesabım",
      icon: User,
      to: "/account",
    },
    {
      key: "cart",
      label: t("header.cart") || "Sepet",
      icon: ShoppingBag,
      to: "/cart",
    },
  ];

  const activeRoot = categoryTree.find((node) => node.id === activeCategoryId);
  const rootChildren = activeRoot?.children || [];
  const activeChild = rootChildren.find((child) => child.id === activeChildId);
  const grandChildren = activeChild?.children || [];

  return (
    <>
      <header className="sticky top-0 z-[70]">
        <div className="rounded-t-2xl border-b border-border bg-white/95 backdrop-blur">
          {/* Mobile top */}
          <div className="md:hidden border-b border-border/70 px-4 py-3">
            <div className="flex items-center justify-center">
              <Link to="/" className="inline-flex items-center gap-2" aria-label="Ayyıldız">
                <img
                  src="/logo.png"
                  alt=""
                  className="h-12 w-12 object-contain"
                  draggable="false"
                />
                <span className="font-serif text-2xl font-bold text-primary">
                  Ayyıldız
                </span>
              </Link>
            </div>
            <form
              onSubmit={onSearchSubmit}
              className="mt-3 flex items-center gap-3"
            >
              <div className="flex flex-1 items-center rounded-full border border-border bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-secondary" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("header.searchPlaceholder")}
                  className="ml-2 w-full border-none text-sm outline-none placeholder:text-secondary/60"
                />
              </div>
              <LanguageSwitcher className="rounded-full border border-border px-4 py-2 text-sm font-medium text-primary" />
            </form>
          </div>

          {/* Desktop top */}
          <div className="hidden md:block">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid h-20 grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className="flex items-center">
                  <Link to="/" className="group inline-flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Ayyıldız İç Giyim"
                      className="h-20 w-20 object-contain"
                      draggable="false"
                    />
                    <span className="font-serif text-3xl font-extrabold tracking-tight text-primary">
                      Ayyıldız İç Giyim
                    </span>
                  </Link>
                </div>
                <div className="flex justify-center">
                  <form
                    onSubmit={onSearchSubmit}
                    className="flex w-full max-w-lg items-center rounded-full border border-border bg-white pl-3 pr-2 py-2 shadow-sm"
                  >
                    <Search className="h-4 w-4 text-secondary" />
                    <input
                      type="text"
                      placeholder={t("header.searchPlaceholder")}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="ml-2 w-full border-none text-sm outline-none placeholder:text-secondary/60"
                    />
                  </form>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <LanguageSwitcher className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-primary" />
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
                    to="/account?tab=Wishlist"
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
            <div className="border-t border-border/70 bg-white">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <nav
                  className="
                    flex h-14 items-center justify-center gap-6
                    text-sm font-medium
                    overflow-x-auto no-scrollbar
                  "
                >
                  {loadingCategories && (
                    <span className="text-sm text-secondary">
                      {t("header.loadingCategories")}
                    </span>
                  )}
                  {!loadingCategories && navError && (
                    <span className="text-sm text-secondary">
                      {t("header.categoriesUnavailable")}
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
                    to="/shop?sale=true"
                    className="shrink-0 text-accent hover:text-accent-hover"
                  >
                    {t("header.sale")}
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-white/95 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] md:hidden">
        <nav className="grid grid-cols-4 text-xs font-medium text-primary">
          {mobileNavItems.map((item) => {
            const { key, label, to, onClick } = item;
            const IconComponent = item.icon;
            const content = (
              <span className="flex flex-col items-center gap-1 py-2">
                <span className="relative">
                  <IconComponent className="h-5 w-5" />
                  {key === "cart" && totalItems > 0 && (
                    <span className="absolute -right-2 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[10px] text-white">
                      {totalItems}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </span>
            );
            if (to) {
              return (
                <Link
                  key={key}
                  to={to}
                  className="text-center hover:text-accent"
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="text-center hover:text-accent"
              >
                {content}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile categories sheet */}
      {mobileCategoryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 md:hidden">
          <div
            className="absolute inset-0"
            onClick={() => setMobileCategoryOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div>
                <p className="text-base font-semibold text-primary">
                  {t("header.categories") || "Kategoriler"}
                </p>
                <p className="text-xs text-secondary">
                  {t("header.categoriesHint") ||
                    "Ana kategoriyi seç ve alt başlıkları görüntüle"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileCategoryOpen(false)}
                className="rounded-full p-2 text-secondary hover:bg-surface-hover"
                aria-label={t("header.closeMenu") || "Kapat"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-5 pt-4">
              {loadingCategories ? (
                <p className="text-sm text-secondary">
                  {t("header.loadingCategories")}
                </p>
              ) : !categoryTree.length ? (
                <p className="text-sm text-secondary">
                  {t("header.categoriesUnavailable")}
                </p>
              ) : (
                <>
                  <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
                    {categoryTree.map((root) => (
                      <button
                        type="button"
                        key={root.id}
                        onClick={() => setActiveCategoryId(root.id)}
                        className="flex flex-col items-center gap-2 min-w-[72px]"
                      >
                        <span
                          className={`grid h-16 w-16 place-items-center rounded-full border text-sm font-semibold ${
                            root.id === activeCategoryId
                              ? "border-primary bg-primary text-white shadow"
                              : "border-border bg-surface text-primary"
                          }`}
                        >
                          {root.name.slice(0, 2)}
                        </span>
                        <span
                          className={`text-center text-xs ${
                            root.id === activeCategoryId
                              ? "text-primary font-semibold"
                              : "text-secondary"
                          }`}
                        >
                          {root.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-6 border-t border-border/60 pt-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-secondary">
                        <span>{t("header.subCategories") || "Alt Kategoriler"}</span>
                        {activeRoot && (
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/shop?category=${activeRoot.id}`);
                              setMobileCategoryOpen(false);
                            }}
                            className="text-accent hover:text-accent-hover"
                          >
                            {t("header.viewAll") || "Tümü"}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {rootChildren.length ? (
                          rootChildren.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveChildId(child.id)}
                              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                                child.id === activeChildId
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border text-secondary hover:text-primary"
                              }`}
                            >
                              {child.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-secondary">
                            {t("header.noSubcategories") || "Alt kategori yok."}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-secondary">
                        {t("header.subLevel") || "Detaylar"}
                      </div>
                      <div className="mt-3 space-y-2">
                        {grandChildren.length ? (
                          grandChildren.map((grand) => (
                            <button
                              key={grand.id}
                              type="button"
                              className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-secondary hover:border-primary hover:text-primary"
                              onClick={() => {
                                navigate(`/shop?category=${grand.id}`);
                                setMobileCategoryOpen(false);
                              }}
                            >
                              {grand.name}
                            </button>
                          ))
                        ) : activeChild ? (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm text-secondary hover:border-primary hover:text-primary"
                            onClick={() => {
                              navigate(`/shop?category=${activeChild.id}`);
                              setMobileCategoryOpen(false);
                            }}
                          >
                            {t("header.goToCategory", { name: activeChild.name }) ||
                              `Tüm ${activeChild.name} ürünleri`}
                          </button>
                        ) : (
                          <p className="text-sm text-secondary">
                            {t("header.selectCategory") ||
                              "Bir alt kategori seçin."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function normalizeTree(nodes = [], prefix = "cat") {
  return nodes.map((node, index) => {
    const safeId =
      node?.id ??
      node?._id ??
      node?.slug ??
      `${prefix}-${index}-${node?.name || "node"}`;
    return {
      ...node,
      id: safeId,
      children: normalizeTree(node.children || [], `${safeId}-child`),
    };
  });
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
