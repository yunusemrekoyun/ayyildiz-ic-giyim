import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AdminModal from "../common/AdminModal";
import { Plus, Trash2 } from "lucide-react";

const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function SetForm({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialSet,
  products = [],
}) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [show, setShow] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const currencyFormatter = useMemo(() => {
    const locale = i18n.language || navigator.language || "tr-TR";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  }, [i18n.language]);

  useEffect(() => {
    if (!open) return;
    setName(initialSet?.name ?? "");
    setDescription(initialSet?.description ?? "");
    setPrice(initialSet?.price != null ? String(initialSet.price) : "");
    setShow(initialSet?.show ?? true);
    setExistingImages(initialSet?.images || []);
    setNewImages([]);
    setRemoveImageIds([]);
    setEntries(
      (initialSet?.products || []).map((entry) => ({
        key: uid(),
        productId: entry.product?.id || entry.product?._id,
        product: entry.product,
        quantity: entry.quantity || 1,
      }))
    );
    setError("");
    setSubmitting(false);
  }, [initialSet, open]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        id: p.id || p._id,
        label: p.name,
        price: p.price,
      })),
    [products]
  );

  const handleAddExisting = () => {
    if (!productOptions.length) return;
    setEntries((prev) => [
      ...prev,
      {
        key: uid(),
        productId: productOptions[0]?.id || "",
        product:
          products.find(
            (p) => (p.id || p._id) === (productOptions[0]?.id || "")
          ) || null,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveEntry = (key) => {
    setEntries((prev) => prev.filter((entry) => entry.key !== key));
  };

  const handleExistingChange = (key, productId) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              productId,
              product:
                products.find((p) => (p.id || p._id) === productId) || null,
            }
          : entry
      )
    );
  };

  const handleQuantityChange = (key, quantity) => {
    const next = Math.max(1, Number(quantity) || 1);
    setEntries((prev) =>
      prev.map((entry) =>
        entry.key === key ? { ...entry, quantity: next } : entry
      )
    );
  };

  // Set görselleri
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewImages((prev) => [...prev, ...mapped]);
  };

  const handleRemoveExistingImage = (publicId) => {
    setExistingImages((prev) =>
      prev.filter((image) => image.publicId !== publicId)
    );
    setRemoveImageIds((prev) => [...prev, publicId]);
  };

  const handleRemoveNewImage = (preview) => {
    setNewImages((prev) => {
      const next = prev.filter((image) => image.preview !== preview);
      const removed = prev.find((image) => image.preview === preview);
      if (removed) {
        try {
          URL.revokeObjectURL(removed.preview);
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  // API'ye gidecek ürün listesi
  const composedSetProducts = () =>
    entries.map((entry) => ({
      productId: entry.productId,
      quantity: entry.quantity,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("admin.sets.errors.nameRequired"));
      return;
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError(t("admin.sets.errors.priceInvalid"));
      return;
    }
    if (!entries.length) {
      setError(t("admin.sets.errors.productRequired"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: numericPrice,
        show,
        products: composedSetProducts(),
        images: newImages.map((image) => image.file),
        removeImagePublicIds: removeImageIds,
      };
      await onSubmit?.(payload);
    } catch (err) {
      setError(err?.message || t("admin.sets.errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={() => {
        if (submitting) return;
        onClose?.();
      }}
      title={
        initialSet?.id
          ? t("admin.sets.form.titleEdit")
          : t("admin.sets.form.titleCreate")
      }
      description={t("admin.sets.form.description")}
      footer={
        <>
          {initialSet?.id && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> {t("admin.common.delete")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            disabled={submitting}
          >
            {t("admin.common.cancel")}
          </button>
          <button
            type="submit"
            form="admin-set-form"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            disabled={submitting}
          >
            {submitting
              ? t("admin.sets.form.saving")
              : initialSet?.id
              ? t("admin.sets.form.saveChanges")
              : t("admin.sets.form.create")}
          </button>
        </>
      }
    >
      <form id="admin-set-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              {t("admin.sets.form.nameLabel")}
              <span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder={t("admin.sets.form.namePlaceholder")}
              maxLength={160}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              {t("admin.sets.form.priceLabel", { currency: "EUR" })}
              <span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder={t("admin.sets.form.pricePlaceholder")}
            />
            {price && (
              <span className="mt-1 block text-xs text-[var(--color-text-admin-muted)]">
                {currencyFormatter.format(Number(price) || 0)}
              </span>
            )}
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              {t("admin.sets.form.descriptionLabel")}
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder={t("admin.sets.form.descriptionPlaceholder")}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-admin)]">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            {t("admin.sets.form.visibleLabel")}
          </label>
        </section>

        <section>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
              {t("admin.sets.form.imagesTitle")}
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
              <Plus className="h-4 w-4" /> {t("admin.sets.form.upload")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </header>
          <div className="mt-3 flex flex-wrap gap-3">
            {existingImages.map((img) => (
              <figure
                key={img.publicId}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={img.url}
                  alt={img.publicId}
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(img.publicId)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  {t("admin.common.remove")}
                </button>
              </figure>
            ))}
            {newImages.map((img) => (
              <figure
                key={img.preview}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={img.preview}
                  alt={t("admin.sets.form.newImageAlt")}
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(img.preview)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  {t("admin.common.remove")}
                </button>
              </figure>
            ))}
          </div>
        </section>

        <section>
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
                {t("admin.sets.form.productsTitle")}
              </h3>
              <p className="text-xs text-[var(--color-text-admin-muted)]">
                {t("admin.sets.form.productsHelp")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddExisting}
                disabled={!productOptions.length}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {t("admin.sets.form.addProduct")}
              </button>
            </div>
          </header>

          <div className="mt-4 space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.key}
                className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
                    {t("admin.sets.form.productCardTitle")}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entry.key)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" /> {t("admin.common.remove")}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      {t("admin.sets.form.productLabel")}
                    </span>
                    <select
                      value={entry.productId || ""}
                      onChange={(e) =>
                        handleExistingChange(entry.key, e.target.value)
                      }
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
                    >
                      {productOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      {t("admin.sets.form.quantityLabel")}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={entry.quantity}
                      onChange={(e) =>
                        handleQuantityChange(entry.key, e.target.value)
                      }
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-[var(--color-bg-hover)] px-4 py-3 text-sm text-[var(--color-accent)]">
            {error}
          </div>
        )}
      </form>
    </AdminModal>
  );
}
