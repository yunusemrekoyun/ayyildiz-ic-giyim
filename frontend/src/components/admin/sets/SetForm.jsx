/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useMemo, useState } from "react";
import AdminModal from "../common/AdminModal";
import TagInput from "../common/TagInput";
import { Plus, Trash2 } from "lucide-react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const uid = () =>
  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));

const emptyNewProduct = (categories = []) => ({
  name: "",
  price: "",
  description: "",
  careInstructions: "",
  details: [],
  category: categories[0]?.id || "",
  colors: [],
  sizes: [],
  showColors: true,
  showSizes: true,
  listedInCatalog: true,
  customAttribute: {
    title: "",
    values: [],
    show: false,
  },
  inventory: [],
});

const pillIdle = "border border-[var(--color-border-admin)] bg-white text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]";

export default function SetForm({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialSet,
  products = [],
  categories = [],
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
        key: crypto.randomUUID(),
        mode: "existing",
        productId: entry.product?.id || entry.product?._id,
        product: entry.product,
        quantity: entry.quantity || 1,
      }))
    );
    setError("");
    setSubmitting(false);
  }, [initialSet, open]);

  const productOptions = useMemo(() => {
    return products.map((product) => ({
      id: product.id || product._id,
      label: product.name,
      price: product.price,
    }));
  }, [products]);

  const categoryOptions = useMemo(() => {
    return categories.map((category) => ({
      id: category.id,
      label: category.label || category.name,
    }));
  }, [categories]);

  const handleAddExisting = () => {
    if (!productOptions.length) return;
    setEntries((prev) => [
      ...prev,
      {
        key: uid(),
        mode: "existing",
        productId: productOptions[0]?.id || "",
        product: products.find((p) => p.id === productOptions[0]?.id) || null,
        quantity: 1,
      },
    ]);
  };

  const handleAddNew = () => {
    setEntries((prev) => [
      ...prev,
      {
        key: uid(),
        mode: "new",
        quantity: 1,
        newProduct: emptyNewProduct(categoryOptions),
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
              product: products.find((p) => p.id === productId) || null,
            }
          : entry
      )
    );
  };

  const handleQuantityChange = (key, quantity) => {
    const next = Math.max(1, Number(quantity) || 1);
    setEntries((prev) =>
      prev.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              quantity: next,
            }
          : entry
      )
    );
  };

  const handleNewProductChange = (key, updater) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              newProduct: updater(entry.newProduct || emptyNewProduct(categoryOptions)),
            }
          : entry
      )
    );
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const mapped = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...mapped]);
  };

  const handleRemoveExistingImage = (publicId) => {
    setExistingImages((prev) => prev.filter((image) => image.publicId !== publicId));
    setRemoveImageIds((prev) => [...prev, publicId]);
  };

  const handleRemoveNewImage = (preview) => {
    setNewImages((prev) => {
      const next = prev.filter((image) => image.preview !== preview);
      const removed = prev.find((image) => image.preview === preview);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const composedSetProducts = () => {
    return entries.map((entry) => {
      if (entry.mode === "existing") {
        return {
          productId: entry.productId,
          quantity: entry.quantity,
        };
      }
      return {
        quantity: entry.quantity,
        newProduct: entry.newProduct,
      };
    });
  };

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
      description="Compose bundles of products and control visibility from a single place."
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
            {submitting ? "Saving..." : initialSet?.id ? "Save changes" : "Create set"}
          </button>
        </>
      }
    >
      <form id="admin-set-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Set name<span className="text-[var(--color-accent)]">*</span>
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              onChange={(event) => setPrice(event.target.value)}
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
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder="Describe what makes this set special."
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-admin)]">
            <input
              type="checkbox"
              checked={show}
              onChange={(event) => setShow(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            Visible in storefront
          </label>
        </section>

        <section>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
              Images
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
              <Plus className="h-4 w-4" />
              Upload
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
                  onClick={() => handleRemoveExistingImage(image.publicId)}
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
                  onClick={() => handleRemoveNewImage(image.preview)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              </figure>
            ))}
          </div>
        </section>

        <section>
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-admin)]">
                Set products
              </h3>
              <p className="text-xs text-[var(--color-text-admin-muted)]">
                Combine existing items or create new ones tailored to this set.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddExisting}
                disabled={!productOptions.length}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Existing product
              </button>
              <button
                type="button"
                onClick={handleAddNew}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
              >
                <Plus className="h-4 w-4" /> New product
              </button>
            </div>
          </header>

          <div className="mt-4 space-y-4">
            {entries.map((entry) => (
              <ProductEntryCard
                key={entry.key}
                entry={entry}
                onRemove={() => handleRemoveEntry(entry.key)}
                onQuantityChange={(value) => handleQuantityChange(entry.key, value)}
                onExistingChange={(productId) => handleExistingChange(entry.key, productId)}
                onNewProductChange={(updater) =>
                  handleNewProductChange(entry.key, updater)
                }
                productOptions={productOptions}
                categories={categoryOptions}
              />
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

function ProductEntryCard({
  entry,
  onRemove,
  onQuantityChange,
  onExistingChange,
  onNewProductChange,
  productOptions,
  categories,
}) {
  if (entry.mode === "existing") {
    const selectOptions = useMemo(() => {
      if (!entry.productId) return productOptions;
      const exists = productOptions.some((option) => option.id === entry.productId);
      if (exists) return productOptions;
      if (!entry.product) return productOptions;
      return [
        ...productOptions,
        {
          id: entry.productId,
          label: entry.product.name || "Unknown product",
        },
      ];
    }, [productOptions, entry.productId, entry.product]);

    return (
      <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
            Existing product
          </h4>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
              Product
            </span>
            <select
              value={entry.productId || ""}
              onChange={(event) => onExistingChange(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
            >
              {selectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
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
              onChange={(event) => onQuantityChange(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <NewProductCard
      entry={entry}
      onRemove={onRemove}
      onQuantityChange={onQuantityChange}
      onChange={onNewProductChange}
      categories={categories}
    />
  );
}

function NewProductCard({ entry, onRemove, onQuantityChange, onChange, categories }) {
  const newProduct = entry.newProduct || emptyNewProduct(categories);
  const [attributeActive, setAttributeActive] = useState(newProduct.customAttribute?.show ?? false);

  useEffect(() => {
    setAttributeActive(newProduct.customAttribute?.show ?? false);
  }, [newProduct.customAttribute?.show]);

  const handleBaseChange = (patch) => {
    onChange((prev) => ({ ...prev, ...patch }));
  };

  const handleAttributeChange = (patch) => {
    onChange((prev) => ({
      ...prev,
      customAttribute: {
        ...prev.customAttribute,
        ...patch,
      },
    }));
  };

  const handleInventoryChange = (inventory) => {
    onChange((prev) => ({ ...prev, inventory }));
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
          Create new product
        </h4>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" /> Remove
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
            Product name<span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            value={newProduct.name}
            onChange={(event) => handleBaseChange({ name: event.target.value })}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
            placeholder="Rose Silk Robe"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
            Price (EUR)<span className="text-[var(--color-accent)]">*</span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newProduct.price}
            onChange={(event) => handleBaseChange({ price: event.target.value })}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
            placeholder="149.00"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
            Category
          </span>
          <select
            value={newProduct.category || ""}
            onChange={(event) => handleBaseChange({ category: event.target.value })}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
          >
            <option value="">Unassigned</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
            Quantity in set
          </span>
          <input
            type="number"
            min="1"
            value={entry.quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
          Description
        </span>
        <textarea
          rows={3}
          value={newProduct.description}
          onChange={(event) => handleBaseChange({ description: event.target.value })}
          className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
          placeholder="Describe this product"
        />
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <TagInput
          label="Available colors"
          values={newProduct.colors}
          onChange={(values) => handleBaseChange({ colors: values })}
          placeholder="Add colour and press Enter"
          helper="Optional"
        />
        <TagInput
          label="Available sizes"
          values={newProduct.sizes}
          onChange={(values) => handleBaseChange({ sizes: values })}
          placeholder="Add size and press Enter"
          helper="Optional"
        />
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
          Care instructions
        </span>
        <textarea
          rows={2}
          value={newProduct.careInstructions}
          onChange={(event) => handleBaseChange({ careInstructions: event.target.value })}
          className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
          placeholder="Hand wash cold, do not tumble dry"
        />
      </label>

      <TagInput
        label="Bullet details"
        values={newProduct.details}
        onChange={(values) => handleBaseChange({ details: values })}
        placeholder="Add detail and press Enter"
        helper="Shown on product detail page"
      />

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-text-admin)]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={newProduct.showColors}
            onChange={(event) => handleBaseChange({ showColors: event.target.checked })}
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          Show colours
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={newProduct.showSizes}
            onChange={(event) => handleBaseChange({ showSizes: event.target.checked })}
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          Show sizes
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={newProduct.listedInCatalog}
            onChange={(event) =>
              handleBaseChange({ listedInCatalog: event.target.checked })
            }
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          List in catalog
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border-admin)] bg-white p-3">
        <label className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-text-admin-muted)]">
            Custom attribute
          </span>
          <input
            type="checkbox"
            checked={attributeActive}
            onChange={(event) => {
              const next = event.target.checked;
              setAttributeActive(next);
              handleAttributeChange({ show: next });
            }}
          />
        </label>
        {attributeActive && (
          <div className="mt-3 space-y-3">
            <input
              value={newProduct.customAttribute?.title || ""}
              onChange={(event) => handleAttributeChange({ title: event.target.value })}
              className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)]"
              placeholder="Attribute title (e.g. Length)"
            />
            <TagInput
              label="Attribute options"
              values={newProduct.customAttribute?.values || []}
              onChange={(values) => handleAttributeChange({ values })}
              placeholder="Add option and press Enter"
            />
          </div>
        )}
      </div>

      <VariantInventoryEditor
        colors={newProduct.showColors ? newProduct.colors : []}
        sizes={newProduct.showSizes ? newProduct.sizes : []}
        attribute={attributeActive ? newProduct.customAttribute : null}
        inventory={newProduct.inventory}
        onChange={handleInventoryChange}
      />
    </div>
  );
}

function VariantInventoryEditor({ colors = [], sizes = [], attribute, inventory = [], onChange }) {
  const combinations = useMemo(() => {
    const colorList = colors.length ? colors : [null];
    const sizeList = sizes.length ? sizes : [null];
    const attributeList = attribute?.values?.length ? attribute.values : [null];
    const combos = [];
    colorList.forEach((color) => {
      sizeList.forEach((size) => {
        attributeList.forEach((attr) => {
          combos.push({ color, size, attributeValue: attr });
        });
      });
    });
    return combos;
  }, [colors, sizes, attribute]);

  const map = useMemo(() => {
    const result = new Map();
    inventory.forEach((entry) => {
      const key = [entry.color || "", entry.size || "", entry.attributeValue || ""].join("||");
      result.set(key, Number(entry.stock) || 0);
    });
    return result;
  }, [inventory]);

  const handleStockChange = (combo, value) => {
    const key = [combo.color || "", combo.size || "", combo.attributeValue || ""].join("||");
    const nextMap = new Map(map);
    nextMap.set(key, Math.max(0, Math.floor(Number(value) || 0)));
    const nextInventory = Array.from(nextMap.entries()).map(([k, stock]) => {
      const [color, size, attributeValue] = k.split("||");
      return {
        color: color || null,
        size: size || null,
        attributeValue: attributeValue || null,
        stock,
      };
    });
    onChange(nextInventory);
  };

  return (
    <div className="mt-4">
      <h5 className="mb-2 text-sm font-semibold text-[var(--color-text-admin)]">
        Inventory
      </h5>
      <div className="rounded-xl border border-[var(--color-border-admin)] bg-white p-3">
        {combinations.length <= 1 ? (
          <label className="flex items-center gap-3 text-sm text-[var(--color-text-admin)]">
            <span className="text-xs text-[var(--color-text-admin-muted)]">
              Stock
            </span>
            <input
              type="number"
              min="0"
              value={map.get("||") || 0}
              onChange={(event) => handleStockChange({ color: null, size: null, attributeValue: null }, event.target.value)}
              className="w-32 rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-1.5 text-sm text-[var(--color-text-admin)]"
            />
          </label>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {combinations.map((combo) => {
              const key = [combo.color || "", combo.size || "", combo.attributeValue || ""].join("||");
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-admin)]/70 px-3 py-2 text-sm"
                >
                  <span className="text-[var(--color-text-admin-muted)]">
                    {[combo.color, combo.size, combo.attributeValue]
                      .filter(Boolean)
                      .join(" · ") || "Default"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={map.get(key) || 0}
                    onChange={(event) => handleStockChange(combo, event.target.value)}
                    className="w-24 rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-1.5 text-sm text-[var(--color-text-admin)]"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
