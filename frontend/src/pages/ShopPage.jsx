import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BreadCrumb from "../components/shop/BreadCrumb";
import ShopPageFilter from "../components/shop/ShopPageFilter";
import ShopPageProducts from "../components/shop/ShopPageProducts";
import { categoryApi } from "../api/categories";
import { productApi } from "../api/products";
import { setApi } from "../api/sets";
import { campaignApi } from "../api/campaigns";
import { mapCategoryTree } from "../utils/catalog";
import SetsSetItem from "../components/sets-sets/SetsSetItem";

const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [matchingSets, setMatchingSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(false);

  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(0);

  const [campaignContext, setCampaignContext] = useState(null);
  const [campaignError, setCampaignError] = useState("");

  const [error, setError] = useState(null);

  const campaignId = searchParams.get("campaign");
  const searchQuery = (searchParams.get("q") || "").trim();

  // Kampanya parametresi aşaması
  useEffect(() => {
    if (!campaignId) {
      setCampaignContext(null);
      setCampaignError("");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setCampaignError("");
        const data = await campaignApi.resolve(campaignId);
        if (!mounted) return;
        if (data.targetType === "SETS") {
          navigate(`/sets?campaign=${campaignId}`, { replace: true });
          return;
        }
        setCampaignContext(data);
      } catch (err) {
        if (!mounted) return;
        setCampaignContext(null);
        setCampaignError(extractMessage(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [campaignId, navigate]);

  // Kategori ağacı
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const treeRes = await categoryApi.tree();
        if (!mounted) return;
        setCategoryTree(mapCategoryTree(treeRes));
      } catch (err) {
        if (!mounted) return;
        setError((prev) => prev || extractMessage(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ürünler + set arama sonuçları
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProducts(true);
        if (campaignContext?.items) {
          const items = campaignContext.items || [];
          const filtered = searchQuery
            ? items.filter((item) =>
                String(item?.name || "")
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase())
              )
            : items;
          if (!mounted) return;
          setProducts(filtered);
          setMatchingSets([]);
          setLoadingSets(false);
        } else {
          const params = { limit: 200 };
          if (searchQuery) params.search = searchQuery;
          const { products: productList = [] } = await productApi.list(params);
          if (!mounted) return;
          setProducts(productList);

          if (searchQuery) {
            setLoadingSets(true);
            try {
              const setResponse = await setApi.list({
                search: searchQuery,
                limit: 60,
              });
              if (!mounted) return;
              setMatchingSets(mapSetsToCards(setResponse));
            } catch (setErr) {
              if (!mounted) return;
              console.error("set search failed", setErr);
              setMatchingSets([]);
            } finally {
              if (mounted) setLoadingSets(false);
            }
          } else {
            setMatchingSets([]);
            setLoadingSets(false);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(extractMessage(err));
        setProducts([]);
        setMatchingSets([]);
        setLoadingSets(false);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [campaignContext, searchQuery]);

  // Fiyat aralığı (ürünlere göre)
  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const vals = products.map((p) => Number(p.finalPrice ?? p.price ?? 0) || 0);
    const mins = Math.min(...vals);
    const maxs = Math.max(...vals);
    return {
      min: Math.max(0, Math.floor(mins)),
      max: Math.max(0, Math.ceil(maxs)),
    };
  }, [products]);

  // URL paramlarını uygula: category (id/slug), price
  useEffect(() => {
    let mounted = true;
    (async () => {
      // CATEGORY
      const categoryParam = searchParams.get("category");
      if (!categoryParam) {
        if (mounted) setSelectedCategory("all");
      } else if (isObjectId(categoryParam)) {
        if (mounted) setSelectedCategory(categoryParam);
      } else {
        // slug -> id çöz
        try {
          const cat = await categoryApi.get(categoryParam); // id veya slug kabul ediyor
          if (!mounted) return;
          const resolvedId = cat?.id || cat?._id || "";
          setSelectedCategory(resolvedId || "all");
        } catch {
          if (mounted) setSelectedCategory("all");
        }
      }

      // PRICE
      const priceParam = searchParams.get("price");
      if (priceParam) {
        const next = Number(priceParam);
        if (mounted) {
          setSelectedPrice(Number.isFinite(next) ? next : priceRange.max);
        }
      } else if (priceRange.max > 0) {
        if (mounted) setSelectedPrice(priceRange.max);
      }
    })();
    return () => {
      mounted = false;
    };
    // priceRange.max değiştiğinde de başlangıç değeri ayarlansın
  }, [searchParams, priceRange.max]);

  // Renk/S beden seçenekleri
  const availableColors = useMemo(() => {
    const m = new Map();
    products.forEach((product) => {
      if (!product?.showColors) return;
      (product.colors || []).forEach((color) => {
        const key = (color || "").toLowerCase();
        if (!key) return;
        if (!m.has(key)) m.set(key, { value: color, label: color });
      });
    });
    return Array.from(m.values());
  }, [products]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      if (!product?.showSizes) return;
      (product.sizes || []).forEach((size) => {
        const trimmed = (size || "").trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set);
  }, [products]);

  // Client-side filtreleme (ID uyumlu hale getirildi)
  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    return (products || []).filter((product) => {
      if (!product) return false;

      // price
      const price = Number(product.finalPrice ?? product.price) || 0;
      if (selectedPrice && price > selectedPrice) return false;

      if (normalizedQuery) {
        const name = String(product.name || "").toLowerCase();
        const slug = String(product.slug || "").toLowerCase();
        if (!name.includes(normalizedQuery) && !slug.includes(normalizedQuery)) {
          return false;
        }
      }

      // category (product.category id’sini normalize et)
      if (selectedCategory !== "all") {
        const catId =
          product.category?.id || product.category?._id || product.category;
        const ancestors = product.category?.ancestors || [];
        // Ürün hem kendi kategorisi hem de ancestors içinde olabilir
        const allRelatedIds = [String(catId), ...ancestors.map(String)];
        if (!allRelatedIds.includes(String(selectedCategory))) return false;
      }

      // color
      if (selectedColor) {
        if (!product.showColors) return false;
        const colors = product.colors || [];
        if (
          !colors
            .map((c) => (c || "").toLowerCase())
            .includes(selectedColor.toLowerCase())
        ) {
          return false;
        }
      }

      // size
      if (selectedSize) {
        if (!product.showSizes) return false;
        const sizes = product.sizes || [];
        if (!sizes.includes(selectedSize)) return false;
      }

      return true;
    });
  }, [
    products,
    selectedCategory,
    selectedColor,
    selectedSize,
    selectedPrice,
    searchQuery,
  ]);

  const activeCampaign = campaignContext?.campaign || null;

  // Filtre eventleri (URL senkron)
  const handleCategoryChange = (id) => {
    setSelectedCategory(id);
    const params = new URLSearchParams(searchParams);
    if (!id || id === "all") params.delete("category");
    else params.set("category", id);
    setSearchParams(params);
  };

  const handlePriceChange = (value) => {
    setSelectedPrice(value);
    const params = new URLSearchParams(searchParams);
    if (!value || value >= priceRange.max) params.delete("price");
    else params.set("price", String(value));
    setSearchParams(params);
  };

  const handleReset = () => {
    setSelectedCategory("all");
    setSelectedColor("");
    setSelectedSize("");
    setSelectedPrice(priceRange.max);
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("price");
    setSearchParams(params);
  };

  const handleClearCampaign = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("campaign");
    setSearchParams(params);
  };

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <BreadCrumb items={[{ label: "Home", to: "/" }, { label: "Shop" }]} />

      <div className="mt-4 text-center">
        <h1 className="text-4xl font-serif font-extrabold tracking-tight text-primary">
          Shop Our Collection
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-secondary">
          Browse curated products uploaded via the admin panel. Filter by
          category, colour, size and price to find your perfect match.
        </p>
      </div>

      {campaignError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{campaignError}</span>
          <button
            type="button"
            onClick={handleClearCampaign}
            className="text-rose-700 underline underline-offset-4 hover:text-rose-800"
          >
            Clear campaign filter
          </button>
        </div>
      )}

      {activeCampaign && !campaignError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <div>
            Showing campaign{" "}
            <span className="font-semibold">“{activeCampaign.name}”</span>
            {activeCampaign.description
              ? ` — ${activeCampaign.description}`
              : ""}
          </div>
          <button
            type="button"
            onClick={handleClearCampaign}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ShopPageFilter
            categoryTree={categoryTree}
            selectedCategory={selectedCategory}
            onCategoryChange={(category) => handleCategoryChange(category.id)}
            colors={availableColors}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            sizes={availableSizes}
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            priceRange={priceRange}
            selectedPrice={selectedPrice}
            onPriceChange={handlePriceChange}
            onReset={handleReset}
          />
        </div>

        <div className="lg:col-span-9">
          <ShopPageProducts
            products={filteredProducts}
            loading={loadingProducts}
          />

          {searchQuery && (
            <div className="mt-12">
              <h2 className="text-2xl font-semibold text-primary">
                Matching Sets
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Results for “{searchQuery}” across trousseau packages.
              </p>

              {loadingSets ? (
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-64 rounded-xl bg-white/70 ring-1 ring-black/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : matchingSets.length ? (
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {matchingSets.map((setCard) => (
                    <SetsSetItem key={setCard.id || setCard.to} {...setCard} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-secondary">
                  No sets match this search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function extractMessage(error) {
  if (!error) return "";
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

function mapSetsToCards(sets) {
  return (Array.isArray(sets) ? sets : []).map((set) => {
    const image = set?.images?.[0]?.url || "/set-placeholder.jpg";
    const title = set?.name || "Untitled Set";
    const desc = set?.description || "";
    const productNames = (set?.products || [])
      .map((entry) => entry?.product?.name)
      .filter(Boolean);
    const includes = productNames.length
      ? productNames.slice(0, 3).join(", ") +
        (productNames.length > 3 ? ` +${productNames.length - 3}` : "")
      : "";

    const rawId = set?._id?.toString?.() || set?.id || set?.slug || "";
    const slugOrId = set?.slug || rawId;
    const to = slugOrId ? `/set/${slugOrId}` : "#";

    const price = Number(set?.price ?? 0);
    const finalPrice = Number(set?.finalPrice ?? price);
    const discount = set?.discount?.percentage;

    return {
      id: rawId || slugOrId || to,
      image,
      title,
      desc,
      includes,
      to,
      price,
      finalPrice,
      discount,
    };
  });
}
