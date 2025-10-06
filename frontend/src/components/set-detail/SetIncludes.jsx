import { Link } from "react-router-dom";

export default function SetIncludes({ products = [] }) {
  if (!products.length) return null;

  return (
    <div className="rounded-lg bg-surface-light ring-1 ring-black/5 p-4">
      <h2 className="text-sm font-semibold text-primary/80 tracking-wide uppercase">
        Includes
      </h2>
      <ul className="mt-3 space-y-2">
        {products.map((entry, idx) => {
          const p = entry?.product;
          if (!p) return null;
          const qty = entry?.quantity || 1;
          const to = p.slug ? `/product/${p.slug}` : `/product/${p.id || ""}`;

          return (
            <li
              key={(p.id || p._id || p.slug || idx) + "-" + idx}
              className="flex items-start justify-between gap-3 rounded-lg bg-white ring-1 ring-black/5 p-3"
            >
              <div className="min-w-0">
                <Link
                  to={to}
                  className="block truncate font-medium text-primary hover:text-accent"
                  title={p.name}
                >
                  {p.name}
                </Link>
                {p.category?.name && (
                  <div className="mt-0.5 text-xs text-secondary">
                    {p.category.name}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-sm text-secondary">× {qty}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
