import { useEffect, useMemo, useState } from "react";
import { Percent, PlusCircle, RefreshCw } from "lucide-react";
import { productApi } from "../../api/products";
import { setApi } from "../../api/sets";
import { categoryApi } from "../../api/categories";
import { discountApi } from "../../api/discounts";
import DiscountTable from "../../components/admin/discounts/DiscountTable.jsx";
import DiscountForm from "../../components/admin/discounts/DiscountForm.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import { flattenCategoryTree } from "../../utils/catalog.js";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
});

export default function AdminDiscounts() {
  const confirm = useConfirm();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [productOptions, setProductOptions] = useState([]);
  const [setOptionsList, setSetOptionsList] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [conflictState, setConflictState] = useState(null);

  useEffect(() => {
    loadDiscounts();
    loadOptions();
  }, []);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const data = await discountApi.list();
      setDiscounts(data);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [productRes, setRes, categoryRes] = await Promise.all([
        productApi.list({ limit: 500, includeHidden: true }),
        setApi.list({ includeHidden: true }),
        categoryApi.tree(),
      ]);

      const mappedProducts = (productRes.products || []).map((product) => ({
        id: String(product.id || product._id || "").trim(),
        label: product.name || "Unnamed product",
        hint: currency.format(product.finalPrice ?? product.price ?? 0),
      }));
      setProductOptions(mappedProducts);

      const mappedSets = (
        Array.isArray(setRes) ? setRes : setRes?.sets || []
      ).map((set) => ({
        id: String(set.id || set._id || "").trim(),
        label: set.name || "Untitled set",
        hint: currency.format(set.finalPrice ?? set.price ?? 0),
      }));
      setSetOptionsList(mappedSets);

      const flatCategories = flattenCategoryTree(categoryRes || []);
      const mappedCategories = flatCategories.map((item) => {
        const catId = item.id || item._id || item.value || item.slug;
        const label =
          (Array.isArray(item.path) && item.path.length
            ? item.path.join(" / ")
            : item.label || item.name || String(catId)) || "Unnamed";
        const hint =
          typeof item.level === "number"
            ? `Level ${item.level + 1}`
            : undefined;
        return { id: String(catId), label, hint };
      });
      setCategoryOptions(mappedCategories);
    } catch (error) {
      setBanner(
        (prev) => prev ?? { variant: "danger", message: extractMessage(error) }
      );
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDiscount(null);
    setConflictState(null);
    setFormSubmitting(false);
  };

  const openCreateModal = () => {
    setEditingDiscount(null);
    setConflictState(null);
    setModalOpen(true);
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setConflictState(null);
    setModalOpen(true);
  };

  const handleDelete = async (discount) => {
    const ok = await confirm({
      title: "Delete discount",
      description: `Remove “${discount.name}”? This cannot be undone.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await discountApi.remove(discount.id);
      setDiscounts((prev) => prev.filter((item) => item.id !== discount.id));
      setBanner({ variant: "warning", message: "Discount deleted" });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      const updated = await discountApi.update(discount.id, {
        active: !discount.active,
      });
      setDiscounts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setBanner({
        variant: "success",
        message: updated.active
          ? `“${updated.name}” activated`
          : `“${updated.name}” deactivated`,
      });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleSubmit = async (payload) => {
    if (formSubmitting) return;
    setFormSubmitting(true);
    try {
      if (editingDiscount?.id) {
        const updated = await discountApi.update(editingDiscount.id, payload);
        setDiscounts((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setBanner({ variant: "success", message: "Discount updated" });
      } else {
        const created = await discountApi.create(payload);
        if (!created?.cancelled) {
          setDiscounts((prev) => [created, ...prev]);
          setBanner({ variant: "success", message: "Discount created" });
        }
      }
      closeModal();
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.conflicts) {
        setConflictState({
          payload,
          conflicts: parsed.conflicts,
          message: parsed.message,
          mode: editingDiscount?.id ? "update" : "create",
          id: editingDiscount?.id || null,
        });
      } else {
        setBanner({
          variant: "danger",
          message: parsed?.message || "Unexpected error",
        });
      }
      setFormSubmitting(false);
    }
  };

  const handleResolveConflict = async (resolution) => {
    if (!conflictState) return;

    if (resolution === "cancel") {
      setConflictState(null);
      setBanner({ variant: "info", message: "Discount action cancelled." });
      setFormSubmitting(false);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = { ...conflictState.payload, resolve: resolution };
      let result;
      if (conflictState.mode === "update" && conflictState.id) {
        result = await discountApi.update(conflictState.id, payload);
        setDiscounts((prev) =>
          prev.map((item) => (item.id === result.id ? result : item))
        );
        setBanner({ variant: "success", message: "Discount updated" });
      } else {
        result = await discountApi.create(payload);
        if (result?.cancelled) {
          setBanner({
            variant: "info",
            message: "Discount creation cancelled.",
          });
        } else {
          setDiscounts((prev) => [result, ...prev]);
          setBanner({ variant: "success", message: "Discount created" });
        }
      }
      setConflictState(null);
      closeModal();
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
      setFormSubmitting(false);
    }
  };

  const activeCount = useMemo(
    () => discounts.filter((item) => item.active).length,
    [discounts]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-bg-hover)]">
            <Percent className="h-6 w-6 text-[var(--color-text-admin)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
              Discounts
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
              Manage catalog-wide promotions and coupons.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDiscounts}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <PlusCircle className="h-4 w-4" /> New discount
          </button>
        </div>
      </header>

      {banner && (
        <AlertBanner
          variant={banner.variant}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-admin)] pb-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-admin)]">
              Active discounts
            </p>
            <p className="text-xs text-[var(--color-text-admin-muted)]">
              {activeCount} active • {discounts.length} total
            </p>
          </div>
        </div>
        <div className="pt-4">
          <DiscountTable
            discounts={discounts}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </div>
      </div>

      <DiscountForm
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialDiscount={editingDiscount}
        productOptions={productOptions}
        setOptions={setOptionsList}
        categoryOptions={categoryOptions}
        submitting={formSubmitting}
        conflict={conflictState}
        onResolveConflict={handleResolveConflict}
      />
    </section>
  );
}

function parseApiError(error) {
  if (!error) return null;
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* ignore */
    }
    return { message: error.message };
  }
  return { message: String(error) };
}

function extractMessage(error) {
  const parsed = parseApiError(error);
  return parsed?.message || "Unexpected error";
}
