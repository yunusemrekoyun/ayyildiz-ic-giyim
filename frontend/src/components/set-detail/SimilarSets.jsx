import { Link } from "react-router-dom";

export default function SimilarSets({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-black/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">
          You might also like
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <article
            key={it.id || it.slug}
            className="overflow-hidden rounded-xl ring-1 ring-black/5 bg-white hover:shadow-sm transition"
          >
            <Link to={`/set/${it.slug || it.id}`}>
              <img
                src={it.image || "/set-placeholder.jpg"}
                alt={it.title}
                className="h-40 w-full object-cover"
                draggable="false"
              />
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-primary">
                  {it.title}
                </h3>
                <p className="mt-1 text-xs text-secondary">
                  {typeof it.price === "number"
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "EUR",
                      }).format(it.price)
                    : ""}
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
