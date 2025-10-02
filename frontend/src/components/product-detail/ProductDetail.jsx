import { useEffect, useMemo, useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const isHexColor = (value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || "");

const pillIdle = "border-border bg-white text-primary hover:bg-surface-hover";

export default function ProductDetail({ product = {} }) {
  const gallery = useMemo(() => {
    const imgs = (product.images || [])
      .map((img) => img?.url || img)
      .filter(Boolean);
    if (imgs.length === 0) return ["/pd-1.jpg"];
    return imgs;
  }, [product.images]);

  const inventory = useMemo(() => product.inventory || [], [product.inventory]);

  const colorOptions = useMemo(() => {
    if (product.showColors === false) return [];
    const map = new Map();
    const register = (color) => {
      if (!color) return;
      const value = String(color).trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          value,
          label: value,
          isHex: isHexColor(value),
        });
      }
    };
    (product.colors || []).forEach(register);
    inventory.forEach((item) => register(item.color));
    return Array.from(map.values());
  }, [inventory, product.colors, product.showColors]);

  const sizeOptions = useMemo(() => {
    if (product.showSizes === false) return [];
    const set = new Set(product.sizes || []);
    inventory.forEach((item) => {
      if (item.size) set.add(item.size);
    });
    return Array.from(set).filter(Boolean);
  }, [inventory, product.sizes, product.showSizes]);

  const attribute = useMemo(() => {
    if (!product.customAttribute?.show) return null;
    const baseValues = product.customAttribute.values || [];
    const map = new Map();
    baseValues.forEach((value) => {
      const key = `${value || ""}`.toLowerCase();
      if (!key) return;
      map.set(key, value);
    });
    inventory.forEach((item) => {
      const key = `${item.attributeValue || ""}`.toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, item.attributeValue);
    });
    const values = Array.from(map.values()).filter(Boolean);
    return {
      title: product.customAttribute.title || "",
      values,
    };
  }, [inventory, product.customAttribute]);

  const [activeImg, setActiveImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAttribute, setSelectedAttribute] = useState(null);

  useEffect(() => {
    setActiveImg(0);
    setQuantity(1);
    setSelectedColor(colorOptions[0]?.value ?? null);
    setSelectedSize(sizeOptions[0] ?? null);
    setSelectedAttribute(attribute?.values?.[0] ?? null);
  }, [product.id, colorOptions, sizeOptions, attribute?.values]);

  const currentStock = useMemo(() => {
    if (!inventory.length) {
      return product.inStock === false ? 0 : null;
    }

    const match = inventory.find((item) => {
      const matchColor = normalize(item.color) === normalize(selectedColor);
      const matchSize = normalize(item.size) === normalize(selectedSize);
      const matchAttr = normalize(item.attributeValue) === normalize(selectedAttribute);
      return matchColor && matchSize && matchAttr;
    });

    return match ? Number(match.stock) || 0 : 0;
  }, [inventory, product.inStock, selectedAttribute, selectedColor, selectedSize]);

  useEffect(() => {
    if (currentStock !== null && currentStock !== undefined && currentStock >= 0) {
      if (currentStock === 0) {
        setQuantity(0);
      } else if (quantity === 0) {
        setQuantity(1);
      } else if (quantity > currentStock) {
        setQuantity(currentStock);
      }
    }
  }, [currentStock, quantity]);

  const maxQty = currentStock === null ? 99 : Math.max(0, currentStock);
  const canPurchase = currentStock === null ? true : currentStock > 0;

  const inc = () => {
    if (!canPurchase) return;
    setQuantity((q) => Math.min(maxQty, q + 1));
  };
  const dec = () => {
    setQuantity((q) => Math.max(canPurchase ? 1 : 0, q - 1));
  };

  const stockLabel = currentStock === null
    ? "In stock"
    : currentStock > 0
    ? `${currentStock} in stock`
    : "Out of stock";

  const description = product.description || "No description provided.";
  const care = product.careInstructions || "";
  const details = Array.isArray(product.details) ? product.details : [];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {/* Left: Gallery */}
      <div className="md:col-span-5">
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <img
            src={gallery[activeImg]}
            alt={product.name || product.title || "Product"}
            className="aspect-[4/5] w-full object-cover"
            draggable="false"
          />
        </div>

        {gallery.length > 1 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {gallery.map((img, index) => (
              <button
                key={img + index}
                onClick={() => setActiveImg(index)}
                className={`overflow-hidden rounded-lg border ${
                  activeImg === index ? "border-accent" : "border-border"
                } bg-white transition`}
              >
                <img
                  src={img}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                  draggable="false"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Info */}
      <div className="md:col-span-7">
        <div className="rounded-xl border border-border bg-contact-bg p-6">
          <h1 className="font-serif text-3xl font-extrabold text-primary">
            {product.name || product.title || "Product"}
          </h1>

          <div className="mt-2 flex items-center gap-3">
            <span className="text-xl font-semibold text-accent">
              {currency.format(product.price || 0)}
            </span>
            {product.compareAtPrice || product.oldPrice ? (
              <span className="text-secondary/60 line-through">
                {currency.format(product.compareAtPrice || product.oldPrice)}
              </span>
            ) : null}
          </div>
          <p className={`mt-1 text-sm ${canPurchase ? "text-accent" : "text-secondary"}`}>
            <span className="mr-1">●</span>
            {stockLabel}
          </p>

          <p className="mt-4 max-w-prose leading-relaxed text-secondary">
            {description}
          </p>

          {colorOptions.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-primary">Colour</p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => {
                  const active =
                    normalize(option.value) === normalize(selectedColor);
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedColor(option.value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? "border-accent bg-accent text-white" : pillIdle
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-border"
                        style={{
                          background:
                            option.isHex
                              ? option.value
                              : "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
                        }}
                        aria-hidden="true"
                      />
                      {option.isHex ? (
                        <span className="sr-only">{option.label}</span>
                      ) : (
                        <span>{option.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizeOptions.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-primary">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const active = size === selectedSize;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-white text-primary hover:bg-surface-hover"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {attribute && attribute.values.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-primary">
                {attribute.title || "Option"}
              </p>
              <div className="flex flex-wrap gap-2">
                {attribute.values.map((value) => {
                  const active = normalize(value) === normalize(selectedAttribute);
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedAttribute(value)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? "border-accent bg-accent text-white" : pillIdle
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
              <button
                onClick={dec}
                className="px-1 text-primary disabled:opacity-50"
                disabled={!canPurchase}
              >
                –
              </button>
              <span className="w-6 text-center text-primary">{quantity}</span>
              <button
                onClick={inc}
                className="px-1 text-primary disabled:opacity-50"
                disabled={!canPurchase}
              >
                +
              </button>
            </div>

            <button
              className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 md:flex-none md:px-8"
              disabled={!canPurchase}
            >
              Add to Cart
            </button>
          </div>

          {care && (
            <div className="mt-6">
              <h3 className="mb-1 font-semibold text-primary">Care</h3>
              <p className="text-sm text-secondary whitespace-pre-line">{care}</p>
            </div>
          )}

          {details.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1 font-semibold text-primary">Details</h3>
              <ul className="list-disc pl-5 text-sm text-secondary">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalize(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}
