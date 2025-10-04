import { Edit3, Trash2 } from "lucide-react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export default function SetTable({ sets = [], loading = false, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-[var(--color-bg-hover)]"
          />
        ))}
      </div>
    );
  }

  if (!sets.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-6 py-12 text-center">
        <p className="max-w-md text-sm text-[var(--color-text-admin-muted)]">
          No sets created yet. Use “New set” to compose a curated bundle.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
        <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Set</th>
            <th className="px-4 py-3 text-left font-medium">Price</th>
            <th className="px-4 py-3 text-left font-medium">Stock</th>
            <th className="px-4 py-3 text-left font-medium">Visibility</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
          {sets.map((set) => (
            <tr key={set.id} className="hover:bg-[var(--color-bg-hover)]/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {set.images?.[0]?.url ? (
                    <img
                      src={set.images[0].url}
                      alt={set.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-admin-muted)]">
                      {set.name?.[0] ?? "S"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{set.name}</div>
                    <div className="text-xs text-[var(--color-text-admin-muted)]">
                      {set.products?.length || 0} items
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {currency.format(set.price || 0)}
              </td>
              <td className="px-4 py-3">
                {set.stock === Number.MAX_SAFE_INTEGER ? "∞" : set.stock ?? 0}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    set.show
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {set.show ? "Visible" : "Hidden"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit?.(set)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete?.(set)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
