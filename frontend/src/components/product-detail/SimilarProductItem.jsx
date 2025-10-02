import { Link } from "react-router-dom";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export default function SimilarProductItem({ image, title, price, slug }) {
  return (
    <Link
      to={slug ? `/product/${slug}` : "#"}
      className="block overflow-hidden rounded-xl bg-white ring-1 ring-border transition hover:shadow-sm"
    >
      <img
        src={image || "/shop-1.jpg"}
        alt={title}
        className="h-48 w-full object-cover"
        draggable="false"
      />
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-accent">
          {currency.format(price || 0)}
        </p>
      </div>
    </Link>
  );
}
