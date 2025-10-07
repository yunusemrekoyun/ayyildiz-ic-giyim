// src/components/categories/Categories.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import CategoryItem from "./CategoryItem";
import { categoryApi } from "../../api/categories";
import { mapCategoryTree } from "../../utils/catalog";

const DESKTOP_VISIBLE = 4;

export default function Categories({
  title = "Featured Categories",
  items,
}) {
  const [categories, setCategories] = useState(items || []);
  const [loading, setLoading] = useState(!items);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (items) return;
    let mounted = true;
    (async () => {
      try {
        const tree = await categoryApi.tree();
        if (!mounted) return;
        const mapped = mapCategoryTree(tree).map((node) => ({
          id: node.id,
          title: node.name,
          image: node.image,
          to: `/shop?category=${node.id}`,
        }));
        setCategories(mapped);
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [items]);

  const showCarousel = useMemo(() => {
    return (categories?.length || 0) > DESKTOP_VISIBLE;
  }, [categories]);

  const scrollByCard = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.querySelector("[data-category-card]");
    const shift = card ? card.clientWidth + 32 : 300;
    container.scrollBy({
      left: direction * shift,
      behavior: "smooth",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="mb-10 text-center text-3xl font-serif font-bold tracking-tight text-primary">
        {title}
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: DESKTOP_VISIBLE }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl bg-surface-light"
            />
          ))}
        </div>
      ) : showCarousel ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-secondary shadow md:inline-flex hover:text-primary"
            aria-label="Previous categories"
          >
            ‹
          </button>
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-8 overflow-x-auto pb-4 md:pb-6 no-scrollbar"
          >
            {categories.map((category) => (
              <div
                key={category.id || category.title}
                data-category-card
                className="w-[260px] shrink-0 snap-start"
              >
                <CategoryItem {...category} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-secondary shadow md:inline-flex hover:text-primary"
            aria-label="Next categories"
          >
            ›
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryItem
              key={category.id || category.title}
              {...category}
            />
          ))}
        </div>
      )}
    </section>
  );
}
