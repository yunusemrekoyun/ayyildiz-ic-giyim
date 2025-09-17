import SimilarProductItem from "./SimilarProductItem";

export default function SimilarProducts({ items = [] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-light p-6">
      <h2 className="mb-4 text-center font-serif text-2xl font-extrabold text-primary">
        Similar Products
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <SimilarProductItem key={p.id} {...p} />
        ))}
      </div>
    </section>
  );
}
