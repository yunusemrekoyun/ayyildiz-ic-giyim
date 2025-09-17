// src/components/categories/Categories.jsx
import CategoryItem from "./CategoryItem";

export default function Categories({
  title = "Featured Categories",
  items = [],
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="mb-10 text-center text-3xl font-serif font-bold tracking-tight text-primary">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <CategoryItem key={it.title} {...it} />
        ))}
      </div>
    </section>
  );
}
