// src/components/shop/ShopPageProductItem.jsx
import { Link } from "react-router-dom";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export default function ShopPageProductItem({ product }) {
  const imageSrc = product?.images?.[0]?.url || "/shop-1.jpg";
  const title = product?.name || "Unnamed product";
  const price = product?.price ?? 0;
  const slug = product?.slug || product?.id;

  return (
    <Link
      to={slug ? `/product/${slug}` : "#"}
      className="block overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-sm transition hover:shadow-md"
    >
      <img
        src={imageSrc}
        alt={title}
        className="h-80 w-full object-cover"
        draggable="false"
      />
      <div className="p-4">
        <h4 className="line-clamp-2 text-lg font-semibold tracking-tight text-primary">
          {title}
        </h4>
        <p className="mt-1 text-secondary">{currency.format(price)}</p>
      </div>
    </Link>
  );
}
