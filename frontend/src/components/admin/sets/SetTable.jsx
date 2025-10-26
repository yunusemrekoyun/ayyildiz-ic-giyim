// frontend/src/components/admin/sets/SetTable.jsx
import { useMemo, useState } from "react";
import { Edit3, Trash2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getColorInfo } from "../../../utils/colors.js";

const INFTY = Number.MAX_SAFE_INTEGER;
const displaySetStock = (stock) => (stock >= INFTY ? "∞" : String(stock ?? 0));

export default function SetTable({
  sets = [],
  loading = false,
  onEdit,
  onDelete,
}) {
  const { t, i18n } = useTranslation();
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectSet, setInspectSet] = useState(null);
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || navigator.language || "tr-TR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }),
    [i18n.language]
  );

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
          {t("admin.sets.empty")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
        <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
          <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                {t("admin.sets.table.set")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("admin.sets.table.price")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("admin.sets.table.stock")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("admin.sets.table.visibility")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("admin.sets.table.actions")}
              </th>
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
                          {t("admin.sets.table.items", {
                            count: set.products?.length || 0,
                          })}
                        </div>
                      </div>
                    </div>
                  </td>
                <td className="px-4 py-3">{currency.format(set.price || 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{displaySetStock(set.stock)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectSet(set);
                        setInspectOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                      title={t("admin.sets.button.inspect")}
                    >
                      <Search className="h-4 w-4" />
                      {t("admin.sets.button.inspect")}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      set.show
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {set.show
                      ? t("admin.sets.visibility.visible")
                      : t("admin.sets.visibility.hidden")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit?.(set)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                    >
                      <Edit3 className="h-4 w-4" /> {t("admin.sets.button.edit")}
                    </button>
                    <button
                      onClick={() => onDelete?.(set)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> {t("admin.sets.button.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspectOpen && inspectSet && (
        <StockInspectModal
          setItem={inspectSet}
          t={t}
          language={i18n.language}
          onClose={() => {
            setInspectOpen(false);
            setInspectSet(null);
          }}
        />
      )}
    </>
  );
}

/* ------------------------- Inspect Modal ------------------------- */

function StockInspectModal({ setItem, onClose, t, language }) {
  // Her ürün için varyantları hazırla
  const rows = useMemo(() => {
    const items = [];
    (setItem.products || []).forEach((sp) => {
      const p = sp.product || {};
      const inv = Array.isArray(p.inventory) ? p.inventory : [];
      if (inv.length === 0) {
        items.push({
          key: `${p.id || p._id || "p"}::default`,
          productName: p.name || t("admin.sets.inspect.unnamed"),
          qtyInSet: sp.quantity || 1,
          variant: { color: null, size: null, attributeValue: null },
          stockCatalog: 0,
          stockSet: 0,
          stock: 0,
        });
        return;
      }
      inv.forEach((v, idx) => {
        const stockCatalog = Number.isFinite(v.stockCatalog)
          ? Number(v.stockCatalog)
          : null;
        const stockSet = Number.isFinite(v.stockSet)
          ? Number(v.stockSet)
          : null;
        const legacy = Number.isFinite(v.stock) ? Number(v.stock) : null;

        items.push({
          key: `${p.id || p._id || "p"}::${idx}`,
          productName: p.name || t("admin.sets.inspect.unnamed"),
          qtyInSet: sp.quantity || 1,
          variant: {
            color: v.color ?? null,
            size: v.size ?? null,
            attributeValue: v.attributeValue ?? null,
          },
          stockCatalog,
          stockSet,
          stock: legacy,
        });
      });
    });
    return items;
  }, [setItem, t]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--color-border-admin)] px-5 py-3">
          <div>
            <h3 className="font-semibold text-[var(--color-text-admin)]">
              {t("admin.sets.inspect.title", { name: setItem.name })}
            </h3>
            <p className="text-xs text-[var(--color-text-admin-muted)]">
              {t("admin.sets.inspect.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            {t("admin.sets.inspect.close")}
          </button>
        </header>

        <div className="max-h-[70vh] overflow-auto p-5">
          <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
            <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {t("admin.sets.inspect.product")}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {t("admin.sets.inspect.variant")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("admin.sets.inspect.qty")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("admin.sets.inspect.stockCatalog")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("admin.sets.inspect.stockSet")}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  {t("admin.sets.inspect.stockLegacy")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-[var(--color-bg-hover)]/40">
                  <td className="px-3 py-2">{r.productName}</td>
                  <td className="px-3 py-2">
                    <VariantLabel
                      color={r.variant.color}
                      size={r.variant.size}
                      attributeValue={r.variant.attributeValue}
                      t={t}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">{r.qtyInSet}</td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(r.stockCatalog, language)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(r.stockSet, language)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(r.stock, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Variant label (renkli) --------------------- */

function VariantLabel({ color, size, attributeValue, t }) {
  const info = getColorInfo(color);
  const parts = [
    info.label || null, // renk adı (paletten çözülmüş)
    size || null,
    attributeValue || null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2">
      {info.value && (
        <span
          className="inline-block h-4 w-4 rounded-full border border-gray-300"
          style={{ background: info.swatch }}
          aria-hidden="true"
        />
      )}
      <span>{parts.length ? parts.join(" · ") : t("admin.sets.inspect.default")}</span>
    </div>
  );
}

function formatNumber(value, language) {
  if (value == null) return "—";
  const locale = language || navigator.language || "tr-TR";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}
