// src/components/home-products/HomeProducts.jsx
import HomeProductItem from "./HomeProductItem";

export default function HomeProducts({
  title = "New Arrivals",
  items = [],
  variant = "boxed", // "boxed" | "merge-top" | "merge-bottom"
  className = "",
}) {
  const isBoxed = variant === "boxed";
  const innerPad = "px-4 py-12 sm:px-6 lg:px-8";

  if (!isBoxed) {
    // Merge modunda: arka plan ve radius parent'ta; sadece içerik render'la
    return (
      <div className={`${innerPad} ${className}`}>
        <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight text-primary">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <HomeProductItem key={i} {...p} />
          ))}
        </div>
      </div>
    );
  }

  // Varsayılan "boxed" görünüm (tek başına kullanılırken)
  return (
    <section
      className={`mx-auto my-10 max-w-[1400px] px-4 sm:px-6 ${className}`}
    >
      <div className={`rounded-xl bg-surface ${innerPad}`}>
        <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight text-primary">
          {title}
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <HomeProductItem key={i} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
