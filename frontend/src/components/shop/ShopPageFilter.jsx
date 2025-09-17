// src/components/shop/ShopPageFilter.jsx
const pillBase =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition";
const pillActive = "bg-accent border-accent text-white shadow";
const pillIdle = "border-border text-primary hover:bg-surface-hover";

const COLORS = ["#eadf7d", "#d8bfa8", "#e3cde1", "#d3d8ea", "#c7d0d0"]; // görseldeki pastel swatch’lar

export default function ShopPageFilter({
  categories = [],
  activeCat,
  onCatChange,
  size,
  onSizeChange,
  color,
  onColorChange,
  price = 500,
  onPriceChange,
  onReset,
}) {
  return (
    <div className="rounded-xl bg-contact-bg p-5 ring-1 ring-border">
      <h3 className="mb-4 text-lg font-semibold text-primary">Filters</h3>

      {/* Categories */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-primary">Categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => onCatChange(c)}
              className={`${pillBase} ${
                activeCat === c ? pillActive : pillIdle
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-primary">Size</p>
        <div className="relative">
          <select
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary focus:outline-none"
          >
            <option value="">Select Size</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
            ▾
          </span>
        </div>
      </div>

      {/* Color */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-primary">Color</p>
        <div className="flex items-center gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c === color ? "" : c)}
              className={`grid h-7 w-7 place-items-center rounded-full ring-2 transition ${
                c === color ? "ring-accent" : "ring-border"
              }`}
              aria-label={c}
            >
              <span
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: c }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-primary">Price Range</p>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={price}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="mt-2 flex justify-between text-sm text-secondary/80">
          <span>$50</span>
          <span>${price}</span>
          <span>$500</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {}}
          className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Apply Filters
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-surface-hover"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
