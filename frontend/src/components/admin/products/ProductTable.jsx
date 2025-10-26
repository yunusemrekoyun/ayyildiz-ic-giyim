import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, Trash2 } from "lucide-react";

export default function ProductTable({
  products = [],
  loading = false,
  onEdit,
  onDelete,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || navigator.language || "tr-TR";
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }),
    [locale]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-hover)]"
          />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-6 py-12 text-center">
        <p className="max-w-sm text-sm text-[var(--color-text-admin-muted)]">
          {t("admin.products.table.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
        <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.products.table.product")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.products.table.category")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.products.table.price")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.products.table.status")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.products.table.updated")}
            </th>
            <th className="px-4 py-3 text-right font-medium">
              {t("admin.products.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-[var(--color-bg-hover)]/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-[var(--color-bg-hover)]" />
                  )}
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    {product.slug && (
                      <div className="text-xs text-[var(--color-text-admin-muted)]">
                        {product.slug}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-[var(--color-text-admin-muted)]">
                  {product.category?.name || "—"}
                </span>
              </td>
              <td className="px-4 py-3">
                {currency.format(product.price ?? 0)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge active={product.isActive} t={t} />
              </td>
              <td className="px-4 py-3 text-[var(--color-text-admin-muted)]">
                {new Date(product.updatedAt || product.createdAt).toLocaleDateString(
                  locale
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit?.(product)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" /> {t("admin.common.edit")}
                  </button>
                  <button
                    onClick={() => onDelete?.(product)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> {t("admin.common.delete")}
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

function StatusBadge({ active, t }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {active
        ? t("admin.products.table.statusVisible")
        : t("admin.products.table.statusHidden")}
    </span>
  );
}
