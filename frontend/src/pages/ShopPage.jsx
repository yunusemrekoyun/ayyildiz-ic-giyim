import { useEffect, useMemo, useState } from "react";
import BreadCrumb from "../components/shop/BreadCrumb";
import ShopPageFilter from "../components/shop/ShopPageFilter";
import ShopPageProducts from "../components/shop/ShopPageProducts";
import { categoryApi, productApi } from "../api";
import { mapCategoryTree } from "../utils/catalog";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ products: productList }, categoryTree] = await Promise.all([
          productApi.list({ limit: 200 }),
          categoryApi.tree(),
        ]);
        if (!mounted) return;
        setProducts(productList || []);
        setCategoryTree(mapCategoryTree(categoryTree));
      } catch (err) {
        if (!mounted) return;
        setError(extractMessage(err));
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const mins = Math.min(
      ...products.map((product) => Number(product.price) || 0)
    );
    const maxs = Math.max(
      ...products.map((product) => Number(product.price) || 0)
    );
    return {
      min: Math.max(0, Math.floor(mins)),
      max: Math.max(0, Math.ceil(maxs)),
    };
  }, [products]);

  useEffect(() => {
    if (priceRange.max > 0) setSelectedPrice(priceRange.max);
  }, [priceRange.max]);

  const availableColors = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      if (!product.showColors) return;
      (product.colors || []).forEach((color) => {
        const key = (color || "").toLowerCase();
        if (!key) return;
        if (!map.has(key)) map.set(key, { value: color, label: color });
      });
    });
    return Array.from(map.values());
  }, [products]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      if (!product.showSizes) return;
      (product.sizes || []).forEach((size) => {
        const trimmed = (size || "").trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((product) => {
      if (!product) return false;
      const price = Number(product.price) || 0;
      if (selectedPrice && price > selectedPrice) return false;

      if (selectedCategory !== "all") {
        const catId =
          product.category?.id || product.category?._id || product.category;
        if (String(catId) !== String(selectedCategory)) return false;
      }

      if (selectedColor) {
        if (!product.showColors) return false;
        const colors = product.colors || [];
        if (
          !colors
            .map((c) => c.toLowerCase())
            .includes(selectedColor.toLowerCase())
        ) {
          return false;
        }
      }

      if (selectedSize) {
        if (!product.showSizes) return false;
        const sizes = product.sizes || [];
        if (!sizes.includes(selectedSize)) return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedColor, selectedSize, selectedPrice]);

  const handleReset = () => {
    setSelectedCategory("all");
    setSelectedColor("");
    setSelectedSize("");
    setSelectedPrice(priceRange.max);
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
            onCategoryChange={(category) => setSelectedCategory(category.id)}
            colors={availableColors}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            sizes={availableSizes}
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
            priceRange={priceRange}
            selectedPrice={selectedPrice}
            onPriceChange={setSelectedPrice}
            onReset={handleReset}
          />
        </div>

        <div className="lg:col-span-9">
          <ShopPageProducts
            products={filteredProducts}
            loading={loadingProducts}
          />
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
    } catch (e) {
      console.error(e);
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
