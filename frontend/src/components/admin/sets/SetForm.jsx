import { useEffect, useMemo, useState } from "react";
import AdminModal from "../common/AdminModal";
import { Plus, Trash2 } from "lucide-react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

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
      setError("Set name is required");
      return;
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("Set price must be valid");
      return;
    }
    if (!entries.length) {
      setError("Add at least one product to the set");
      return;
    }
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
      setError(err.message || "Failed to save set");
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
      title={initialSet?.id ? "Edit set" : "Create set"}
      description="Compose bundles of products from your catalog."
      footer={
        <>
          {initialSet?.id && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-set-form"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : initialSet?.id
              ? "Save changes"
              : "Create set"}
          </button>
        </>
      }
    >
      <form id="admin-set-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Genel bilgiler */}
        <section className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Set name<span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder="Premium Wedding Package"
              maxLength={160}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Price (EUR)<span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder="499.00"
            />
            {price && (
              <span className="mt-1 block text-xs text-[var(--color-text-admin-muted)]">
                {currency.format(Number(price) || 0)}
              </span>
            )}
          </label>
          <label className="md:col-span-2 block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Description
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder="Describe what makes this set special."
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-admin)]">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            Visible in storefront
          </label>
        </section>

        {/* Set görselleri */}
        <section>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
              Images
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
              <Plus className="h-4 w-4" /> Upload
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
                  Remove
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
                  alt="New upload"
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(img.preview)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              </figure>
            ))}
          </div>
        </section>

        {/* Set ürünleri */}
        <section>
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
                Set products
              </h3>
              <p className="text-xs text-[var(--color-text-admin-muted)]">
                Pick items from your existing catalog.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddExisting}
                disabled={!productOptions.length}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Add product
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
                    Product
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entry.key)}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Product
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
                      Quantity
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
