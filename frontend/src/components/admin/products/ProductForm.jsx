import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import AdminModal from "../common/AdminModal";
import TagInput from "../common/TagInput";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const makeKey = ({ color, size, attributeValue }) =>
  [color || "", size || "", attributeValue || ""].join("||");

export default function ProductForm({
  open,
  onClose,
  onSubmit,
  initialProduct = null,
  categories = [],
}) {
  const isEditing = Boolean(initialProduct?.id);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [detailsInput, setDetailsInput] = useState("");
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [showColors, setShowColors] = useState(true);
  const [showSizes, setShowSizes] = useState(true);
  const [attributeTitle, setAttributeTitle] = useState("");
  const [attributeValues, setAttributeValues] = useState([]);
  const [showAttribute, setShowAttribute] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialProduct?.name ?? "");
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
    setCategoryId(resolveCategoryId(initialProduct?.category));
    setDescription(initialProduct?.description ?? "");
    setCareInstructions(initialProduct?.careInstructions ?? "");
    setDetailsInput((initialProduct?.details || []).join("\n"));
    setColors(initialProduct?.colors || []);
    setSizes(initialProduct?.sizes || []);
    setShowColors(initialProduct?.showColors ?? true);
    setShowSizes(initialProduct?.showSizes ?? true);
    const attr = initialProduct?.customAttribute || {};
    setAttributeTitle(attr.title || "");
    setAttributeValues(attr.values || []);
    setShowAttribute(attr.show ?? false);
    setInventory(
      (initialProduct?.inventory || []).map((item) => ({
        color: sanitizeOption(item.color),
        size: sanitizeOption(item.size),
        attributeValue: sanitizeOption(item.attributeValue),
        stock: Number(item.stock) || 0,
      }))
    );
    setInventoryOpen((initialProduct?.inventory || []).length > 1);
    setIsActive(initialProduct?.isActive ?? true);
    setExistingImages(initialProduct?.images || []);
    setNewImages([]);
    setRemoveImageIds([]);
    setError("");
    setSubmitting(false);
  }, [initialProduct, open]);

  useEffect(() => {
    return () => {
      newImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [newImages]);

  const attributeActive = useMemo(() => {
    return (
      showAttribute &&
      Boolean(attributeTitle.trim()) &&
      attributeValues.length > 0
    );
  }, [showAttribute, attributeTitle, attributeValues.length]);

  useEffect(() => {
    if (!open) return;
    const colorList = showColors && colors.length ? colors : [null];
    const sizeList = showSizes && sizes.length ? sizes : [null];
    const attributeList = attributeActive ? attributeValues : [null];

    const nextCombos = [];
    colorList.forEach((color) => {
      sizeList.forEach((size) => {
        attributeList.forEach((attributeValue) => {
          nextCombos.push({
            color: sanitizeOption(color),
            size: sanitizeOption(size),
            attributeValue: sanitizeOption(attributeValue),
          });
        });
      });
    });

    setInventory((prev) => {
      const aggregated = new Map();
      prev.forEach((item) => {
        const normalizedKey = makeKey({
          color: showColors ? item.color : null,
          size: showSizes ? item.size : null,
          attributeValue: attributeActive ? item.attributeValue : null,
        });
        aggregated.set(
          normalizedKey,
          (aggregated.get(normalizedKey) || 0) + (Number(item.stock) || 0)
        );
      });

      return nextCombos.map((combo) => ({
        ...combo,
        stock: aggregated.get(makeKey(combo)) || 0,
      }));
    });
  }, [
    open,
    colors,
    sizes,
    attributeValues,
    showColors,
    showSizes,
    attributeActive,
  ]);

  const totalImages = useMemo(
    () => existingImages.length + newImages.length,
    [existingImages.length, newImages.length]
  );

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = Math.max(
      0,
      8 - (existingImages.length + newImages.length)
    );
    if (remainingSlots <= 0) {
      setError("Maximum of 8 images reached");
      return;
    }

    const mapped = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    if (!mapped.length) return;
    setNewImages((prev) => [...prev, ...mapped]);
    setError("");
  };

  const removeExistingImage = (image) => {
    setExistingImages((prev) =>
      prev.filter((item) => item.publicId !== image.publicId)
    );
    setRemoveImageIds((prev) => [...prev, image.publicId]);
    setError("");
  };

  const removeNewImage = (image) => {
    setNewImages((prev) => {
      const next = prev.filter((item) => item.preview !== image.preview);
      URL.revokeObjectURL(image.preview);
      return next;
    });
    setError("");
  };

  const handleStockChange = (comboKey, value) => {
    const numeric = Math.max(0, Math.floor(Number(value)));
    setInventory((prev) =>
      prev.map((item) =>
        makeKey(item) === comboKey
          ? { ...item, stock: Number.isFinite(numeric) ? numeric : 0 }
          : item
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Product name is required");
      return;
    }
    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setError("Enter a valid product price");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        price: priceValue,
        category: categoryId || "",
        description,
        careInstructions,
        details: detailsInput
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean),
        colors,
        sizes,
        showColors,
        showSizes,
        customAttribute: {
          title: attributeTitle.trim(),
          values: attributeValues,
          show:
            showAttribute &&
            attributeTitle.trim() &&
            attributeValues.length > 0,
        },
        inventory: inventory.map((item) => ({
          color: item.color ?? null,
          size: item.size ?? null,
          attributeValue:
            attributeActive && item.attributeValue ? item.attributeValue : null,
          stock: Number(item.stock) || 0,
        })),
        isActive,
        images: newImages.map((item) => item.file),
        removeImagePublicIds: removeImageIds,
      };

      await onSubmit?.(payload);
      onClose?.();
    } catch (err) {
      const message = extractMessage(err) || "Unable to save product";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const variantColumns = useMemo(() => {
    const columns = [];
    if (showColors && colors.length)
      columns.push({ key: "color", label: "Color" });
    if (showSizes && sizes.length) columns.push({ key: "size", label: "Size" });
    if (attributeActive)
      columns.push({
        key: "attributeValue",
        label: attributeTitle || "Option",
      });
    if (!columns.length) columns.push({ key: "variant", label: "Variant" });
    return columns;
  }, [
    showColors,
    colors.length,
    showSizes,
    sizes.length,
    attributeActive,
    attributeTitle,
  ]);

  return (
    <AdminModal
      open={open}
      onClose={() => {
        if (submitting) return;
        onClose?.();
      }}
      title={isEditing ? "Edit product" : "Create product"}
      description="Manage catalog entries, pricing and imagery."
      footer={
        <>
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
            form="admin-product-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : isEditing
              ? "Update product"
              : "Create product"}
          </button>
        </>
      }
    >
      <form
        id="admin-product-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Product name
                <span className="text-[var(--color-accent)]">*</span>
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder="Luxury Silk Pajama Set"
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
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder="129.90"
              />
              {price && !Number.isNaN(Number(price)) && (
                <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                  {currencyFormatter.format(Number(price))}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Category
              </span>
              <select
                value={categoryId || ""}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              >
                <option value="">No category assigned</option>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-text-admin)]">
                Visibility
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-sm text-[var(--color-text-admin)]">
                  {isActive ? "Visible in storefront" : "Hidden"}
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Description
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder="Short marketing copy shown on the product page."
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Care instructions
              </span>
              <textarea
                rows={3}
                value={careInstructions}
                onChange={(event) => setCareInstructions(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder="e.g. Hand wash cold, do not tumble dry"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Bullet details
              </span>
              <textarea
                rows={4}
                value={detailsInput}
                onChange={(event) => setDetailsInput(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder="One detail per line"
              />
              <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                These points appear as bullet items under “Details”.
              </p>
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SelectionCard
            title="Colors"
            description="Add optional colour swatches."
            checked={showColors}
            onToggle={() => setShowColors((prev) => !prev)}
          >
            <TagInput
              label="Color options"
              values={colors}
              onChange={setColors}
              placeholder="Add color and press Enter"
              helper="Displayed if visible is on."
              disabled={!showColors}
            />
          </SelectionCard>

          <SelectionCard
            title="Sizes"
            description="Maintain available clothing sizes."
            checked={showSizes}
            onToggle={() => setShowSizes((prev) => !prev)}
          >
            <TagInput
              label="Size options"
              values={sizes}
              onChange={setSizes}
              placeholder="Add size and press Enter"
              helper="Example: XS, S, M, L, XL"
              disabled={!showSizes}
            />
          </SelectionCard>

          <SelectionCard
            title="Product attribute"
            description="Add a custom option like length or material."
            checked={showAttribute}
            onToggle={() => setShowAttribute((prev) => !prev)}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                Attribute title
              </span>
              <input
                value={attributeTitle}
                onChange={(event) => setAttributeTitle(event.target.value)}
                disabled={!showAttribute}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                placeholder="e.g. Cut length"
              />
            </label>
            <TagInput
              label="Attribute options"
              values={attributeValues}
              onChange={setAttributeValues}
              placeholder="Add option and press Enter"
              helper="Shown beneath the attribute title."
              disabled={!showAttribute || !attributeTitle.trim()}
            />
          </SelectionCard>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
                Inventory management
              </h4>
              <p className="text-xs text-[var(--color-text-admin-muted)]">
                Set stock per variant. Missing values default to zero.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInventoryOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            >
              {inventoryOpen ? "Hide inventory" : "Manage inventory"}
            </button>
          </div>
          {inventoryOpen && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
                <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
                  <tr>
                    {variantColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-3 py-2 text-left font-medium"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
                  {inventory.map((combo) => {
                    const comboKey = makeKey(combo);
                    return (
                      <tr key={comboKey}>
                        {variantColumns.map((column) => (
                          <td key={column.key} className="px-3 py-2">
                            {column.key === "variant"
                              ? "Default"
                              : combo[column.key] || "—"}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={combo.stock}
                            onChange={(event) =>
                              handleStockChange(comboKey, event.target.value)
                            }
                            className="w-32 rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
              Media gallery
            </h4>
            <span className="text-xs text-[var(--color-text-admin-muted)]">
              {totalImages} / 8 images
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
            Upload high-quality square images. Drag to reorder after save.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-admin)] px-4 py-3 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
              <Upload className="h-4 w-4" />
              Add images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelection}
              />
            </label>
            {existingImages.map((image) => (
              <figure
                key={image.publicId}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={image.url}
                  alt={image.publicId}
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(image)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              </figure>
            ))}
            {newImages.map((image) => (
              <figure
                key={image.preview}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={image.preview}
                  alt="New upload"
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(image)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              </figure>
            ))}
            {!existingImages.length && !newImages.length && (
              <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-[var(--color-border-admin)] text-[var(--color-text-admin-muted)]">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--color-bg-hover)] px-4 py-3 text-sm text-[var(--color-accent)]">
            {error}
          </div>
        )}
      </form>
    </AdminModal>
  );
}

function resolveCategoryId(category) {
  if (!category) return "";
  if (typeof category === "string") return category;
  return category?.id || category?._id || "";
}

function sanitizeOption(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function extractMessage(error) {
  if (!error) return "";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch (e) {
      console.error(e);
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}

function SelectionCard({ title, description, checked, onToggle, children }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
            {title}
          </h4>
          <p className="text-xs text-[var(--color-text-admin-muted)]">
            {description}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-admin)]">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          Show
        </label>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
