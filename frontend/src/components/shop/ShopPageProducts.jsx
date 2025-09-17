// src/components/shop/ShopPageProducts.jsx
import ShopPageProductItem from "./ShopPageProductItem";

export default function ShopPageProducts({ products = [] }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ShopPageProductItem key={p.id} {...p} />
        ))}
      </div>
      {products.length === 0 && (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-border p-10 text-secondary">
          No products found for selected filters.
        </div>
      )}
    </div>
  );
}
